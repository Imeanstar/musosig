// supabase/functions/manager-alert-half/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. 최근 접속한 멤버 조회 (접속한 지 좀 된 사람들)
    // 범위를 넓게 잡고 필터링 (최소 12시간 이상 지난 사람)
    const timeLimit = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    
    // 매니저의 푸시 토큰이 필요하므로 join
    const { data: members, error } = await supabase
      .from('users')
      .select(`
        id, name, last_seen_at, settings,
        manager:manager_id ( push_token )
      `)
      .eq('role', 'member')
      .lt('last_seen_at', timeLimit);

    if (error) throw error;

    const messages = [];
    const nowMs = Date.now();

    for (const member of members) {
      // 설정 주기 (기본 48시간)
      const cycleHours = member.settings?.alertCycle || 48;
      const halfCycle = cycleHours / 2; // 절반 (예: 24시간)

      const lastSeenMs = new Date(member.last_seen_at).getTime();
      const diffHours = (nowMs - lastSeenMs) / (1000 * 60 * 60);

      // ★ 조건: 절반 시간이 지났고, 15분(0.25h) 내외인가? (Time Window)
      // 예: 24.0시간 ~ 24.25시간 사이
      if (diffHours >= halfCycle && diffHours < halfCycle + 0.25) {
        
        const managerToken = Array.isArray(member.manager) 
          ? member.manager[0]?.push_token 
          : member.manager?.push_token;

        if (managerToken) {
          messages.push({
            to: managerToken,
            sound: 'default',
            title: '안부 확인 요청 ⚠️',
            body: `${member.name}님이 ${Math.floor(halfCycle)}시간째 소식이 없습니다. 먼저 연락해 보시는 건 어떨까요?`,
            data: { url: '/(tabs)/index' }, // 매니저 앱 링크
          });
        }
      }
    }

    if (messages.length > 0) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      });
    }

    return new Response(JSON.stringify({ success: true, sent: messages.length }), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});