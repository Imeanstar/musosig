// supabase/functions/emergency-sms-flag/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { crypto } from "jsr:@std/crypto";

// CoolSMS 인증 헤더 생성기
async function getAuthHeader(apiKey: string, apiSecret: string) {
  const date = new Date().toISOString();
  const salt = crypto.randomUUID().replace(/-/g, "");
  const signatureData = date + salt;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(apiSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signatureData));
  const signatureHex = Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signatureHex}`;
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const apiKey = Deno.env.get('COOLSMS_API_KEY') ?? '';
    const apiSecret = Deno.env.get('COOLSMS_API_SECRET') ?? '';
    const senderPhone = Deno.env.get('COOLSMS_SENDER_PHONE') ?? '';

    // 1. 최소 24시간 이상 지난 사람만 1차 필터링 (DB 부하 줄이기)
    const timeLimit = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: members, error } = await supabase
      .from('users')
      .select(`
        id, name, last_seen_at, settings, last_sms_sent_at,
        manager:manager_id ( phone )
      `)
      .eq('role', 'member')
      .lt('last_seen_at', timeLimit);

    if (error) throw error;

    const results = [];
    const nowMs = Date.now();
    const authHeader = await getAuthHeader(apiKey, apiSecret);

    for (const member of members) {
      const cycleHours = member.settings?.alertCycle || 48; // 기본 48시간
      const lastSeenMs = new Date(member.last_seen_at).getTime();
      const diffHours = (nowMs - lastSeenMs) / (1000 * 60 * 60);

      // ★ 조건 1: 설정된 시간이 지났는가? (48시간 경과)
      if (diffHours >= cycleHours) {
        
        // ★ 조건 2 (핵심): 이 건에 대해 이미 문자를 보냈는가? (Flag 체크)
        // last_sms_sent_at이 없거나, 마지막 접속 시간보다 '이전'이라면 -> 아직 안 보낸 것!
        const lastSmsDate = member.last_sms_sent_at ? new Date(member.last_sms_sent_at).getTime() : 0;
        
        if (lastSmsDate < lastSeenMs) {
          
          // 발송 대상!
          const managerPhone = Array.isArray(member.manager) ? member.manager[0]?.phone : member.manager?.phone;
          
          if (managerPhone) {
            const receiverPhone = managerPhone.replace(/-/g, '');
            console.log(`🚨 긴급 문자 발송: ${member.name} -> ${receiverPhone}`);

            // 1. 문자 발송
            await fetch("https://api.solapi.com/messages/v4/send", {
              method: "POST",
              headers: { "Authorization": authHeader, "Content-Type": "application/json" },
              body: JSON.stringify({
                message: {
                  to: receiverPhone,
                  from: senderPhone,
                  text: `[무소식 긴급] ${member.name}님이 ${Math.floor(diffHours)}시간 이상 연락이 닿지 않습니다. 안전을 확인해주세요.`
                }
              })
            });

            // 2. 🚩 깃발 꽂기 (DB 업데이트)
            await supabase
              .from('users')
              .update({ last_sms_sent_at: new Date().toISOString() })
              .eq('id', member.id);

            results.push(member.name);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, sent_to: results }), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});