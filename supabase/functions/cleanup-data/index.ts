// supabase/functions/cleanup-data/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Hello from cleanup-data!");

Deno.serve(async (req) => {
  try {
    // 1. Supabase 관리자 권한 클라이언트 생성 (서비스 키 필요)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 2. 기준 날짜 계산
    const now = new Date();
    const threeMonthsAgo = new Date(now.setMonth(now.getMonth() - 3)).toISOString();
    const oneYearAgo = new Date(now.setFullYear(now.getFullYear() - 1)).toISOString();

    console.log(`🧹 청소 시작! (일반: ${threeMonthsAgo} 이전, 프리미엄: ${oneYearAgo} 이전)`);

    // 3. 삭제 대상 조회 (DB 조회)
    // 조건: (일반회원 AND 3개월 지남) OR (프리미엄회원 AND 1년 지남)
    // 주의: 실제로는 OR 쿼리가 복잡하므로 두 번 나누어 조회하는 게 안전하고 빠릅니다.

    // [Group A] 일반 회원 삭제 대상
    const { data: standardLogs, error: err1 } = await supabaseAdmin
      .from('check_in_logs')
      .select('id, proof_url, member_id, users!inner(is_premium)')
      .eq('users.is_premium', false)
      .lt('created_at', threeMonthsAgo);

    if (err1) throw err1;

    // [Group B] 프리미엄 회원 삭제 대상
    const { data: premiumLogs, error: err2 } = await supabaseAdmin
      .from('check_in_logs')
      .select('id, proof_url, member_id, users!inner(is_premium)')
      .eq('users.is_premium', true)
      .lt('created_at', oneYearAgo);

    if (err2) throw err2;

    // 두 그룹 합치기
    const targets = [...(standardLogs || []), ...(premiumLogs || [])];

    if (targets.length === 0) {
      return new Response(JSON.stringify({ message: "삭제할 데이터가 없습니다." }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`총 ${targets.length}개의 만료된 로그 발견.`);

    // 4. 스토리지 파일 삭제
    // proof_url에서 파일 경로만 추출 (예: "https://.../proof_shots/user1/abc.jpg" -> "user1/abc.jpg")
    const filesToRemove = targets
      .map(log => {
        if (!log.proof_url) return null;
        const urlParts = log.proof_url.split('/proof_shots/');
        return urlParts.length > 1 ? urlParts[1] : null;
      })
      .filter(path => path !== null);

    if (filesToRemove.length > 0) {
      const { error: storageError } = await supabaseAdmin
        .storage
        .from('proof_shots')
        .remove(filesToRemove);
      
      if (storageError) console.error("스토리지 삭제 중 에러:", storageError);
      else console.log(`🗑️ 스토리지에서 ${filesToRemove.length}개 파일 삭제 완료.`);
    }

    // 5. DB 로그 삭제
    const idsToDelete = targets.map(log => log.id);
    const { error: dbError } = await supabaseAdmin
      .from('check_in_logs')
      .delete()
      .in('id', idsToDelete);

    if (dbError) throw dbError;

    console.log(`DB에서 ${idsToDelete.length}개 로그 삭제 완료.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        deletedCount: targets.length,
        storageFiles: filesToRemove.length 
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Cleanup Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});