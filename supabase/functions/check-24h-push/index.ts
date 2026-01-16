// supabase/functions/check-24h-push/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    
    // 💡 핵심 변경: 범위를 '1시간'에서 '6분'으로 대폭 축소
    // (5분마다 실행되므로, 지난 5분간 놓친 사람이 없도록 6분 전까지 조회)
    const time24hAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();       // 딱 24시간 전
    const timeWindow = new Date(now.getTime() - (24 * 60 + 6) * 60 * 1000).toISOString(); // 24시간 6분 전

    // "24시간은 지났는데, 아직 24시간 6분은 안 지난 사람" 찾기
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, name, push_token')
      .lt('last_seen_at', time24hAgo)  // 24시간 지남
      .gt('last_seen_at', timeWindow)  // 24시간 6분은 안 지남 (중복 발송 방지)
      .not('push_token', 'is', null);

    if (error) throw error;

    console.log(`🔔 5분 주기 정밀 체크: ${users.length}명 대상`);

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ message: '대상자 없음' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 메시지 내용은 동일
    const messages = users.map(user => ({
      to: user.push_token,
      sound: 'default',
      title: '생존신고 알림 🚨',
      body: '24시간 동안 접속이 없습니다. 내일까지 접속하지 않으면 비상연락망으로 문자가 발송됩니다!',
      data: { url: '/(tabs)/index' },
    }));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    
    return new Response(
      JSON.stringify({ success: true, count: users.length }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});