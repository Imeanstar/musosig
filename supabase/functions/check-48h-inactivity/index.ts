// 48시간 동안 생존신고가 없는 위험군 사용자를 찾는 Supabase Edge Function
// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

console.log("🔍 48시간 미활동 사용자 체크 시작");

Deno.serve(async (req) => {
  try {
    // 1. Supabase 클라이언트 생성 (SERVICE_ROLE_KEY 사용)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("❌ 환경 변수 누락: SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ error: "서버 설정 오류" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 2. 48시간 전 타임스탬프 계산
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const cutoffTime = fortyEightHoursAgo.toISOString();

    console.log(`⏰ 현재 시간 (UTC): ${now.toISOString()}`);
    console.log(`⏰ 48시간 전 기준: ${cutoffTime}`);

    // 3. DB 조회: last_seen_at이 48시간 전보다 과거이고 null이 아닌 사용자
    const { data: missingUsers, error } = await supabase
      .from("users")
      .select("id, name, phone, emergency_contacts, last_seen_at")
      .lt("last_seen_at", cutoffTime)
      .not("last_seen_at", "is", null);

    if (error) {
      console.error("❌ DB 조회 실패:", error);
      return new Response(
        JSON.stringify({ error: "데이터베이스 조회 실패", details: error.message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. 결과 처리 및 로그 출력
    const missingCount = missingUsers?.length || 0;
    
    console.log(`\n📊 위험군 사용자 수: ${missingCount}명\n`);

    if (missingCount > 0) {
      console.log("⚠️ ===== 48시간 미활동 위험군 사용자 목록 =====");
      missingUsers?.forEach((user, index) => {
        console.log(`\n[${index + 1}] ${user.name} (${user.phone})`);
        console.log(`   마지막 활동: ${user.last_seen_at}`);
        console.log(`   비상연락망: ${user.emergency_contacts?.length || 0}명`);
        if (user.emergency_contacts && user.emergency_contacts.length > 0) {
          user.emergency_contacts.forEach((contact: string, i: number) => {
            console.log(`      ${i + 1}. ${contact}`);
          });
        } else {
          console.log(`      ⚠️ 비상연락망 없음`);
        }
      });
      console.log("\n================================================\n");
    } else {
      console.log("✅ 현재 위험군 사용자 없음 (모두 48시간 이내 활동)\n");
    }

    // 5. JSON 응답 반환
    return new Response(
      JSON.stringify({
        missing_count: missingCount,
        message: missingCount > 0
          ? `${missingCount}명의 위험군 사용자가 발견되었습니다.`
          : "모든 사용자가 안전합니다.",
        checked_at: now.toISOString(),
        cutoff_time: cutoffTime,
        users: missingUsers || [],
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("❌ 예상치 못한 오류:", error);
    return new Response(
      JSON.stringify({ 
        error: "서버 오류", 
        details: error instanceof Error ? error.message : String(error) 
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/* 로컬 테스트 방법:

  1. Supabase 로컬 환경 시작:
     supabase start

  2. HTTP 요청:
     curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/check-48h-inactivity' \
       --header 'Authorization: Bearer [YOUR_ANON_KEY]' \
       --header 'Content-Type: application/json'

  3. 배포:
     supabase functions deploy check-48h-inactivity

  4. Cron으로 자동 실행 (매일 오전 9시):
     Supabase Dashboard > Database > Cron Jobs에서 설정
     또는 GitHub Actions 등에서 주기적으로 호출

*/
