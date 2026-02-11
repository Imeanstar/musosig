-- 🚨 긴급 RLS 수정 SQL
-- Supabase Dashboard → SQL Editor에서 실행

-- ============================================
-- 1. users 테이블 - 위험한 정책 삭제 및 재생성
-- ============================================

-- 기존 위험한 정책 삭제
DROP POLICY IF EXISTS "Enable all access" ON users;

-- 안전한 정책 생성
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Manager는 자신의 member 정보 조회 가능
CREATE POLICY "Managers can view their members"
  ON users FOR SELECT
  USING (
    role = 'member' 
    AND manager_id = auth.uid()
  );

-- ============================================
-- 2. check_in_logs 테이블 - 읽기 권한 제한
-- ============================================

-- 기존 "Enable read for all" 정책 삭제
DROP POLICY IF EXISTS "Enable read for all" ON check_in_logs;

-- Member는 자신의 로그만 조회
CREATE POLICY "Members can read own logs"
  ON check_in_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = check_in_logs.member_id
      AND users.id = auth.uid()
    )
  );

-- Manager는 자신의 멤버 로그 조회
CREATE POLICY "Managers can read member logs"
  ON check_in_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = check_in_logs.member_id
      AND users.manager_id = auth.uid()
    )
  );

-- ============================================
-- 3. point_logs 테이블 - 정책 강화
-- ============================================

-- 기존 정책 확인 후 필요시 수정
DROP POLICY IF EXISTS "Enable read/insert for own logs" ON point_logs;

-- 자신의 포인트 로그만 조회
CREATE POLICY "Users can read own point logs"
  ON point_logs FOR SELECT
  USING (auth.uid() = user_id);

-- 포인트 로그는 서버에서만 생성 (RPC 함수 사용)
-- INSERT는 service_role로만 가능하도록 제한
CREATE POLICY "System can insert point logs"
  ON point_logs FOR INSERT
  WITH CHECK (false); -- 클라이언트에서 직접 insert 불가

-- ============================================
-- 4. check_in_logs INSERT 정책 강화
-- ============================================

DROP POLICY IF EXISTS "Enable insert for members" ON check_in_logs;

-- Member는 자신의 로그만 생성 가능
CREATE POLICY "Members can insert own logs"
  ON check_in_logs FOR INSERT
  WITH CHECK (
    auth.uid() = member_id
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'member'
    )
  );

-- ============================================
-- 5. 확인 쿼리
-- ============================================

-- 모든 테이블의 RLS 활성화 확인
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 각 테이블의 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
