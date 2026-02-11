# 🚨 보안 사고 대응 절차 (긴급)

## 📍 현재 상황
- ⚠️ Supabase URL과 Anon Key가 GitHub에 노출됨
- ⚠️ 여러 번 커밋되어 Git 히스토리에 영구 기록됨
- ⚠️ 악성 봇이 이미 스캔했을 가능성 높음

## ⏰ 타임라인 (즉시 시작)

### 🔴 Phase 1: 즉시 조치 (10분 이내)

#### 1-1. Supabase 키 즉시 재발급 (최우선!)

```bash
# 브라우저에서 즉시 실행
https://supabase.com/dashboard/project/qeikodkvdzczerweonyb/settings/api
```

**Supabase Dashboard 접속 후**:
1. ✅ Settings → API 클릭
2. ✅ "Reset" 버튼 클릭 (Anon Key 옆)
3. ✅ 새로 생성된 키 복사
4. ✅ `.env` 파일에 새 키 저장

**⚠️ 중요**: 기존 키는 즉시 무효화되어 모든 API 호출이 차단됩니다.

#### 1-2. RLS(Row Level Security) 즉시 활성화

Supabase에 RLS가 활성화되지 않았다면, 지금 당장:

```sql
-- Supabase SQL Editor에서 즉시 실행

-- 모든 테이블 RLS 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_in_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_verses ENABLE ROW LEVEL SECURITY;

-- 긴급 임시 정책: 모든 외부 접근 차단 (나중에 완화)
CREATE POLICY "Emergency: Block all public access"
  ON users FOR ALL
  USING (auth.uid() = id);
```

#### 1-3. Supabase 접근 로그 확인

```bash
# Dashboard → Logs → API 클릭
# 의심스러운 IP 주소 확인:
# - 해외 IP (특히 중국, 러시아, 북한)
# - 짧은 시간 내 대량 요청
# - 알 수 없는 User-Agent
```

---

### 🟠 Phase 2: Git 히스토리 정리 (30분 이내)

#### 방법 A: BFG Repo-Cleaner (권장)

```bash
# 1. BFG 다운로드
brew install bfg  # Mac
# 또는
choco install bfg  # Windows

# 2. 백업 생성
cd C:\Users\User\Desktop
cp -r Anbu Anbu_backup

# 3. 민감 정보 삭제
cd Anbu
bfg --replace-text passwords.txt

# passwords.txt 파일 내용:
# qeikodkvdzczerweonyb.supabase.co
# eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlaWtvZGt2ZHpjemVyd2VvbnliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxOTIyNTEsImV4cCI6MjA4Mzc2ODI1MX0.GdJ7K3rikBfr-sJuZghn5WSYu_mVdQfQHZj_noGZJs4

# 4. Git 히스토리 재작성
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 5. 강제 Push (⚠️ 위험: 팀원과 협의 필요)
git push origin --force --all
```

#### 방법 B: GitHub 저장소 완전 삭제 후 재생성 (더 안전)

```bash
# 1. GitHub에서 저장소 삭제
# https://github.com/사용자명/저장소명/settings
# → Danger Zone → Delete this repository

# 2. 로컬에서 .git 폴더 삭제
cd C:\Users\User\Desktop\Anbu
rm -rf .git

# 3. 새로운 Git 초기화
git init
git add .
git commit -m "Initial commit (cleaned)"

# 4. 새 GitHub 저장소 생성 후 Push
git remote add origin https://github.com/사용자명/새저장소명.git
git push -u origin main
```

---

### 🟡 Phase 3: 피해 범위 확인 (1시간 이내)

#### 3-1. Supabase 데이터베이스 확인

```sql
-- 최근 생성된 사용자 확인 (의심스러운 계정)
SELECT id, email, created_at, last_sign_in_at
FROM auth.users
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- 비정상적인 API 호출 패턴
SELECT *
FROM check_in_logs
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 100;

-- 포인트 이상 거래
SELECT *
FROM point_logs
WHERE created_at > NOW() - INTERVAL '7 days'
  AND ABS(amount) > 1000  -- 비정상적으로 큰 포인트
ORDER BY created_at DESC;
```

#### 3-2. GitHub Secret Scanning Alerts 확인

```bash
# GitHub 저장소 페이지에서:
# Settings → Security → Secret scanning alerts
# 
# ⚠️ Supabase 키가 탐지되었다면 알림이 있을 것
```

---

### 🟢 Phase 4: 재발 방지 조치 (완료)

#### 4-1. 이미 완료된 조치 ✅

- ✅ `.gitignore`에 `.env` 추가
- ✅ `lib/supabase.ts` 환경 변수로 전환
- ✅ `SECURITY.md` 문서 생성

#### 4-2. 추가 조치

```bash
# 1. git-secrets 설치 (커밋 전 자동 검사)
brew install git-secrets  # Mac
# 또는
choco install git-secrets  # Windows

# 2. 프로젝트에 적용
cd C:\Users\User\Desktop\Anbu
git secrets --install
git secrets --register-aws  # AWS 패턴
git secrets --add 'supabase\.co'
git secrets --add 'eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*'

# 3. 테스트
echo "https://test.supabase.co" >> test.txt
git add test.txt
git commit -m "test"
# → 커밋이 차단되어야 함!
```

---

## 📊 피해 가능성 평가

| 시나리오 | 가능성 | 심각도 | 대응 |
|---------|--------|--------|------|
| 악성 봇이 키를 스캔함 | 80% | 높음 | ✅ 키 재발급 |
| 실제 DB 접근 시도 | 40% | 매우 높음 | ✅ RLS 활성화 |
| 데이터 유출 | 10% | 치명적 | 로그 확인 필요 |
| 데이터 변조/삭제 | 5% | 치명적 | 백업 확인 필요 |

---

## 🎯 체크리스트 (모두 완료 확인)

### 즉시 (10분)
- [ ] Supabase Anon Key 재발급
- [ ] `.env` 파일에 새 키 저장
- [ ] RLS 활성화 확인
- [ ] 앱 테스트 (정상 작동 확인)

### 1시간 내
- [ ] Git 히스토리 정리 (BFG 또는 저장소 재생성)
- [ ] Supabase 로그 확인
- [ ] 의심스러운 데이터 확인
- [ ] GitHub Secret Scanner 확인

### 24시간 내
- [ ] git-secrets 설치 및 설정
- [ ] 팀원들에게 보안 사고 공유
- [ ] 비밀번호 변경 (Supabase 계정, GitHub 계정)
- [ ] 2FA 활성화 (아직 안 했다면)

### 1주일 내
- [ ] Supabase 백업 생성
- [ ] 보안 감사 로그 보관
- [ ] 재발 방지 교육
- [ ] 모니터링 시스템 구축

---

## 🆘 추가 도움이 필요하다면

### Supabase Support
- Discord: https://discord.supabase.com
- 이메일: support@supabase.com
- 긴급: "Security Incident" 태그 사용

### GitHub Support
- https://support.github.com
- 주제: "Leaked credentials in repository"

---

## 📝 사후 보고서 작성 (학습용)

사고 대응 완료 후 다음 내용 기록:

1. **발견 경위**: 언제, 어떻게 발견했는가?
2. **노출 기간**: 첫 Push부터 키 재발급까지 시간
3. **피해 범위**: 실제 피해가 있었는가?
4. **대응 조치**: 무엇을 했는가?
5. **재발 방지**: 앞으로 어떻게 할 것인가?

---

## 💡 교훈

> "실수는 누구나 합니다. 중요한 것은 빠르게 대응하고 배우는 것입니다."

- ✅ 자동화된 보안 검사 (git-secrets)
- ✅ 민감 정보는 절대 코드에 넣지 않기
- ✅ `.env.example`만 커밋하기
- ✅ 정기적인 키 로테이션

---

**작성일**: 2026.02.11  
**대응 시작**: 즉시  
**긴급도**: 🔴 CRITICAL
