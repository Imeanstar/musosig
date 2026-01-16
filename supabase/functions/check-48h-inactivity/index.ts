// supabase/functions/check-48h-inactivity/index.ts

import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 💡 변경점 1: 24시간(하루) 전 시간 계산
    const timeLimit = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 24시간 미활동 + 토큰이 있는 유저 찾기
    const { data: missingUsers, error } = await supabaseAdmin
      .from('users')
      .select('id, push_token, name')
      .lt('last_seen_at', timeLimit) // 24시간 지났는지 확인
      .not('push_token', 'is', null)

    if (error) throw error

    console.log(`🔍 24시간 미접속자 발견: ${missingUsers.length}명`)

    if (!missingUsers || missingUsers.length === 0) {
      return new Response(JSON.stringify({ message: '보낼 알림 없음' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 💡 변경점 2: 메시지를 '경고'보다는 '안부 확인' 느낌으로 변경
    const notifications = missingUsers.map((user) => ({
      to: user.push_token,
      sound: 'default',
      title: '무소식 안부 확인 👋',
      body: `${user.name}님, 24시간 이내 앱 접속이 없으셨네요. 별일 없으신가요? (앱을 켜서 출석을 해주세요)`,
      data: { screen: 'check-in' },
    }))

    // Expo로 발송
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notifications),
    })

    const result = await response.json()
    console.log('✅ 알림 전송 결과:', result)

    return new Response(
      JSON.stringify({ success: true, sent_count: missingUsers.length, details: result }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})