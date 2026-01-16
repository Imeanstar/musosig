// supabase/functions/emergency-48h/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { crypto } from "jsr:@std/crypto";

// CoolSMS 인증 헤더 생성기
async function getAuthHeader(apiKey: string, apiSecret: string) {
  const date = new Date().toISOString();
  const salt = crypto.randomUUID().replace(/-/g, "");
  const signatureData = date + salt;
  
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(apiSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signatureData)
  );
  
  const signatureHex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signatureHex}`;
}

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const apiKey = Deno.env.get('COOLSMS_API_KEY') ?? '';
    const apiSecret = Deno.env.get('COOLSMS_API_SECRET') ?? '';
    const senderPhone = Deno.env.get('COOLSMS_SENDER_PHONE') ?? '';

    if (!apiKey || !apiSecret || !senderPhone) {
      throw new Error("CoolSMS 설정이 누락되었습니다.");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // 48시간 이상 미접속자 조회
    const timeLimit = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    
    const { data: criticalUsers, error } = await supabaseAdmin
      .from('users')
      .select('id, name, emergency_contacts, last_seen_at')
      .lt('last_seen_at', timeLimit)
      .not('emergency_contacts', 'is', null);

    if (error) throw error;

    console.log(`🚨 48시간 위험군 발견: ${criticalUsers.length}명`);

    if (!criticalUsers || criticalUsers.length === 0) {
      return new Response(JSON.stringify({ message: '대상자 없음' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const results = [];
    const authHeader = await getAuthHeader(apiKey, apiSecret);

    // 💡 수정됨: 유저 한 명당 -> 여러 보호자에게 반복 발송
    for (const user of criticalUsers) {
      
      // 1. 연락처를 무조건 배열로 만듦 (문자열 하나라도 배열로 변환)
      let contactList = [];
      if (Array.isArray(user.emergency_contacts)) {
        contactList = user.emergency_contacts;
      } else {
        contactList = [user.emergency_contacts]; // ["010-xxxx-xxxx"]
      }

      // 2. 보호자 목록을 순회하며 전송
      for (const contact of contactList) {
        let receiverPhone = String(contact).replace(/-/g, ''); // 하이픈 제거

        if (!receiverPhone) continue;

        console.log(`📤 전송 시도: ${user.name} -> ${receiverPhone}`);

        // CoolSMS 전송
        const response = await fetch("https://api.solapi.com/messages/v4/send", {
          method: "POST",
          headers: {
            "Authorization": authHeader,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message: {
              to: receiverPhone,
              from: senderPhone,
              text: `[무소식 긴급알림] ${user.name}님이 48시간 이상 연락이 닿지 않습니다. 안전을 확인해주세요.`
            }
          })
        });

        const result = await response.json();
        results.push({ user: user.name, receiver: receiverPhone, result });
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});