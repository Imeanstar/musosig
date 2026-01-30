// supabase/functions/daily-nudge-21h/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. 한국 시간 기준 '오늘 00시' 계산
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const nowKst = new Date(now.getTime() + kstOffset);
    // 오늘 00:00:00 KST
    const startOfTodayKst = new Date(nowKst.getFullYear(), nowKst.getMonth(), nowKst.getDate(), 0, 0, 0);
    // 이를 다시 UTC로 변환 (DB 비교용)
    const startOfTodayUtc = new Date(startOfTodayKst.getTime() - kstOffset).toISOString();

    console.log(`📅 오늘(${startOfTodayUtc} 이후) 출석 안 한 사람 찾기`);

    // 2. '오늘 출석한 사람'의 ID 목록 조회
    const { data: checkedInMembers } = await supabase
      .from('check_in_logs')
      .select('member_id')
      .gt('created_at', startOfTodayUtc);

    const checkedInIds = checkedInMembers?.map(log => log.member_id) || [];

    // 3. '출석 안 한 멤버' 조회
    let query = supabase
      .from('users')
      .select('id, name, push_token')
      .eq('role', 'member')
      .not('push_token', 'is', null);

    // (출석한 사람이 있다면 제외)
    if (checkedInIds.length > 0) {
      query = query.not('id', 'in', `(${checkedInIds.join(',')})`);
    }

    const { data: targetUsers, error } = await query;
    if (error) throw error;

    if (!targetUsers || targetUsers.length === 0) {
      return new Response(JSON.stringify({ message: "모두 출석 완료!" }), { headers: { "Content-Type": "application/json" } });
    }

    // 4. 푸시 발송
    const messages = targetUsers.map(user => ({
      to: user.push_token,
      sound: 'default',
      title: '하루를 마무리하셨나요? 🌙',
      body: `${user.name}님, 주무시기 전에 오늘의 안부를 남겨주세요!`,
      data: { url: '/(tabs)/index' },
    }));

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });

    return new Response(JSON.stringify({ success: true, sent: messages.length }), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});