# 🔒 무소식(Musosik) 보안 가이드

## 📋 목차
- [GitHub에 Push하기 전 필수 체크리스트](#github에-push하기-전-필수-체크리스트)
- [환경 변수 설정](#환경-변수-설정)
- [Supabase 보안 설정](#supabase-보안-설정)
- [앱 빌드 전 보안 체크](#앱-빌드-전-보안-체크)
- [취약점 신고](#취약점-신고)

---

## ⚠️ GitHub에 Push하기 전 필수 체크리스트

### 🚨 **절대로 커밋하면 안 되는 것들**

- [ ] ❌ `.env` 파일
- [ ] ❌ Supabase URL/Key 하드코딩
- [ ] ❌ CoolSMS API Key
- [ ] ❌ Google OAuth Client Secret
- [ ] ❌ `google-services.json`
- [ ] ❌ Apple 인증서 (`.p12`, `.p8`)
- [ ] ❌ 실제 사용자 전화번호/이메일
- [ ] ❌ 프로덕션 DB 덤프 파일

### ✅ **커밋 전 확인 사항**

```bash
# 1. .gitignore가 제대로 설정되었는지 확인
git status

# 2. 민감 정보 검색
grep -r "supabase.co" . --exclude-dir=node_modules
grep -r "API_KEY" . --exclude-dir=node_modules
grep -r "SECRET" . --exclude-dir=node_modules

# 3. 커밋 이력에 민감 정보가 없는지 확인
git log --all --full-history --source -- '*supabase*'
```

---

## 🔑 환경 변수 설정

### 1. `.env` 파일 생성

프로젝트 루트에 `.env` 파일을 생성하고 다음 내용 추가:

```bash
# .env (절대로 GitHub에 업로드 금지!)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. EAS Build 환경 변수 설정

```bash
# EAS Build용 시크릿 설정
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://..."
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJ..."
```

### 3. Supabase Edge Function 환경 변수

```bash
# Supabase Dashboard → Settings → Edge Functions → Secrets
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
COOLSMS_API_KEY=...
COOLSMS_API_SECRET=...
COOLSMS_SENDER_PHONE=01012345678
```

---

## 🛡️ Supabase 보안 설정

### 1. Row Level Security (RLS) 활성화

**필수**: 모든 테이블에 RLS 활성화

```sql
-- users 테이블
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "사용자는 자신의 데이터만 조회 가능"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "사용자는 자신의 데이터만 수정 가능"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- check_in_logs 테이블
ALTER TABLE check_in_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "멤버는 자신의 체크인만 생성 가능"
  ON check_in_logs FOR INSERT
  WITH CHECK (auth.uid() = member_id);

CREATE POLICY "매니저는 자신의 멤버 로그만 조회 가능"
  ON check_in_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = check_in_logs.member_id
      AND users.manager_id = auth.uid()
    )
  );

-- point_logs 테이블
ALTER TABLE point_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "사용자는 자신의 포인트 내역만 조회"
  ON point_logs FOR SELECT
  USING (auth.uid() = user_id);
```

### 2. Rate Limiting 설정

Supabase Dashboard → Settings → API:

- **Anonymous requests**: 100/hour
- **Authenticated requests**: 1000/hour

### 3. CORS 설정

```sql
-- 프로덕션 도메인만 허용
-- Supabase Dashboard → Settings → API → CORS
musosik://*
https://your-production-domain.com
```

---

## 🔐 앱 빌드 전 보안 체크

### 1. Proguard/R8 난독화 (Android)

`android/app/build.gradle`:

```gradle
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

### 2. 디버그 로그 제거

`babel.config.js`:

```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // 프로덕션에서 console.log 제거
      ['transform-remove-console', {
        exclude: ['error', 'warn']
      }]
    ]
  };
};
```

### 3. SSL Pinning (고급)

MITM 공격 방지를 위한 SSL 인증서 고정:

```typescript
// 참고: expo-ssl-pinning 라이브러리 사용
import { preventSSRF } from 'expo-ssl-pinning';
```

---

## 🚨 취약점 신고

보안 취약점을 발견하셨나요?

**절대 Public Issue로 올리지 마세요!**

대신 다음으로 연락해주세요:
- 📧 이메일: security@musosik.app (예시)
- 🔒 암호화 통신 권장 (PGP 키 제공)

**보상 프로그램** (선택사항):
- Critical: 스타벅스 기프티콘
- High: 감사 인사
- Medium: README에 기여자 등록

---

## 📚 참고 자료

- [OWASP Mobile Top 10](https://owasp.org/www-project-mobile-top-10/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [Expo Security](https://docs.expo.dev/guides/security/)
- [React Native Security](https://reactnative.dev/docs/security)

---

## 🔄 정기 보안 점검

- [ ] 월 1회: 의존성 취약점 스캔 (`npm audit`)
- [ ] 분기 1회: Supabase RLS 정책 검토
- [ ] 릴리즈 전: 보안 체크리스트 재확인
- [ ] 연 1회: 외부 보안 감사 (선택)

---

**마지막 업데이트**: 2026.02.11  
**보안 감사자**: AI Security Consultant (Kevin Mitnick & Mikko Hyppönen Style)
