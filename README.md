# 🏥 무소식(無消息) - 노인 생존 신고 앱

> **24시간 안부 확인 시스템**으로 어르신의 안전을 지키는 React Native 앱

![React Native](https://img.shields.io/badge/React_Native-0.76.6-61DAFB?logo=react)
![Expo](https://img.shields.io/badge/Expo-~52.0-000020?logo=expo)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-3178C6?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase)

## 📋 목차
- [개요](#-개요)
- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [프로젝트 구조](#-프로젝트-구조)
- [시작하기](#-시작하기)
- [환경 설정](#-환경-설정)
- [배포](#-배포)
- [라이선스](#-라이선스)

## 📖 개요

**무소식(無消息)**은 혼자 사는 어르신들의 안전을 지키기 위한 **생존 신고 앱**입니다.

### 핵심 가치
- 🎯 **간단한 출석**: 하루 한 번, 큰 버튼 터치로 안부 전달
- 🔔 **자동 알림**: 24시간 미접속 시 푸시 알림 (5분마다 정밀 체크)
- 📱 **긴급 문자**: 48시간 미접속 시 보호자에게 SMS 자동 발송
- 👨‍👩‍👧‍👦 **비상연락망**: 최대 3명의 보호자 연락처 관리
- 🧠 **치매 예방**: Premium 유저는 두뇌 훈련 수학 문제 풀이
- 🔒 **안전한 인증**: Supabase Auth + RLS로 데이터 보안 강화

## ✨ 주요 기능

### 1. **일일 생존 신고**
- ✅ 300x300px 대형 원형 버튼 (노인 친화적)
- ✅ 하루 1회 출석 체크 (`users.last_seen_at` 기반)
- ✅ 오늘 출석 여부 자동 확인 (새로고침 시 유지)
- ✅ **방어적 로직** 적용으로 신규 가입자 버그 수정

### 2. **사용자 관리**
- ✅ 전화번호 기반 회원가입/자동 로그인
- ✅ 로컬 스토리지로 자동 로그인
- ✅ 데이터 초기화 기능

### 3. **비상연락망 관리**
- ✅ 최대 3명의 보호자 연락처 등록
- ✅ 실시간 추가/삭제
- ✅ Supabase + AsyncStorage 양방향 동기화

### 4. **Premium 기능** 👑
- ✅ 치매 예방 두뇌 훈련 (두 자리 수 덧셈)
- ✅ 정답을 맞춰야 출석 완료
- ✅ 설정에서 Premium 모드 테스트 가능

### 5. **푸시 알림 시스템** 🔔
- ✅ 로그인 시 자동 Expo Push Token 발급
- ✅ Foreground에서도 알림 표시
- ✅ 24시간 미접속 시 자동 안부 확인 알림
- ✅ Supabase Edge Function으로 자동 발송

### 6. **법률 문서**
- ✅ 이용약관 (Notion 페이지 WebView)
- ✅ 개인정보처리방침 (Notion 페이지 WebView)
- ✅ 설정 화면에서 언제든지 확인 가능
- ✅ 실제 노션 링크로 운영 중

## 🔄 최근 주요 업데이트 (v1.1)

### 🎯 핵심 개선

#### 1. **Supabase Auth 연동** ⭐ (2024.01)
- 전화번호 기반 자동 인증 시스템 구축
- RLS (Row Level Security) 정책 활성화로 데이터 보안 강화
- `signInWithPassword` / `signUp` 자동 처리

#### 2. **출석 로직 방어적 개선** 🛡️
- **문제**: 신규 가입자도 "완료" 버튼으로 표시되는 버그
- **해결**: `last_seen_at` null 체크 + Early Return 패턴
- **결과**: 5가지 방어 로직으로 모든 예외 상황 명시적 처리

#### 3. **DB 구조 단순화**
- `check_ins` 테이블 제거 → `users.last_seen_at` 필드로 통합
- 쿼리 성능 개선 및 데이터 정합성 향상

#### 4. **24시간 알림 정밀화**
- 5분 주기로 6분 윈도우 체크 (중복 발송 방지)
- 48시간 미접속자에게 보호자 SMS 발송 (CoolSMS)

---

# Version Log
## Ver 1.0
<img width="600" alt="ver1_1" src="https://github.com/user-attachments/assets/cd5ca22d-3b8a-4ef2-bb47-9631e32cfbc1">
<img width="600" alt="ver1_2" src="https://github.com/user-attachments/assets/8f82edc7-bebc-47d4-8ec3-8fa7d83b131a">
<img width="600" alt="ver1_3" src="https://github.com/user-attachments/assets/89f5f18d-d240-4d5d-9244-59894b95d27d">
<img width="600" alt="ver1_4" src="https://github.com/user-attachments/assets/93cff638-2241-43dc-9d59-30aa4629d1c5">
<img width="600" alt="ver1_5" src="https://github.com/user-attachments/assets/524ca1c9-32d8-4ba7-b633-4dfc14fa8ae1">
<img width="600" alt="ver1_6" src="https://github.com/user-attachments/assets/bfb9bdfc-9fec-44e6-8577-07afb514c8cf">

---

## 🛠️ 기술 스택

### Frontend
- **Framework**: React Native (Expo Managed Workflow)
- **Language**: TypeScript
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Navigation**: Expo Router (File-based)
- **Icons**: Lucide React Native
- **State**: React Hooks (useState, useEffect, Custom Hooks)

### Backend
- **BaaS**: Supabase
  - PostgreSQL Database
  - Edge Functions (Deno)
  - Row Level Security (RLS)
- **Push**: Expo Push Notification Service

### DevOps
- **Build**: EAS (Expo Application Services)
- **Version Control**: Git + GitHub

## 📁 프로젝트 구조

```
Anbu/
├── app/                        # Expo Router 화면
│   ├── index.tsx              # 메인 화면 (230줄, 리팩토링됨)
│   ├── _layout.tsx            # 레이아웃 설정
│   └── styles.ts              # 스타일 정의
│
├── components/                 # 재사용 컴포넌트
│   ├── LegalModal.tsx         # 법률 문서 WebView
│   └── modals/
│       ├── RegisterModal.tsx  # 회원가입 모달
│       ├── MathChallengeModal.tsx  # 수학 문제 모달
│       └── SettingsModal.tsx  # 설정 모달
│
├── hooks/                      # 커스텀 훅
│   ├── useUserManagement.ts   # 사용자 관리 (등록/로그인/Premium)
│   └── useCheckIn.ts          # 출석 체크 로직
│
├── utils/                      # 유틸리티 함수
│   ├── storage.ts             # AsyncStorage 헬퍼
│   ├── date.ts                # 날짜 관련 함수
│   └── notificationHelper.ts  # 푸시 알림 핵심 로직
│
├── types/                      # TypeScript 타입 정의
│   └── index.ts               # UserInfo, MathProblem, etc.
│
├── constants/                  # 상수
│   └── index.ts               # 메시지, URL, 설정값
│
├── lib/                        # 외부 라이브러리 설정
│   └── supabase.ts            # Supabase 클라이언트
│
└── supabase/                   # Supabase 설정
    └── functions/
        ├── check-24h-push/        # 24시간 푸시 알림 (5분마다)
        │   └── index.ts
        └── emergency-48h/         # 48시간 긴급 SMS (매일 9시)
            └── index.ts
```

## 🚀 시작하기

### 1. 저장소 클론

```bash
git clone https://github.com/Imeanstar/musosig.git
cd musosig
```

### 2. 패키지 설치

```bash
npm install
```

### 3. 환경 설정

#### 3.1 Supabase 프로젝트 생성
1. [Supabase](https://supabase.com) 회원가입
2. 새 프로젝트 생성
3. `lib/supabase.ts`에 URL과 ANON_KEY 입력

#### 3.2 데이터베이스 스키마

```sql
-- users 테이블 (Auth 연동)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  emergency_contacts TEXT[] DEFAULT '{}',
  is_premium BOOLEAN DEFAULT false,
  push_token TEXT,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_last_seen ON users(last_seen_at);
CREATE INDEX idx_users_push_token ON users(push_token) WHERE push_token IS NOT NULL;
```

#### 3.3 RLS (Row Level Security) 정책 설정 ⭐

```sql
-- RLS 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 정책 1: 로그인한 유저는 자기 자신의 데이터만 조회 가능
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- 정책 2: 로그인한 유저는 자기 자신의 데이터만 수정 가능
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- 정책 3: 로그인한 유저는 자기 자신의 데이터만 삽입 가능
CREATE POLICY "Users can insert own data"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);
```

#### 3.4 Supabase Auth 설정

**Dashboard > Authentication > Providers:**
- ✅ Email 활성화
- ⚠️ "Confirm email" 비활성화 (자동 승인)

**이메일 형식:** `{전화번호}@musosik.app` (예: `01012345678@musosik.app`)  
**비밀번호 형식:** `musosik{전화번호}` (예: `musosik01012345678`)

### 4. 앱 실행

```bash
# 개발 서버 시작
npm start

# Android
npm run android

# iOS
npm run ios
```

## ⚙️ 환경 설정

### Expo 설정 (`app.json`)

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "fb9d4656-08fb-45dc-bbca-7cfcc423f8b3"
      }
    },
    "plugins": [
      ["expo-notifications", { ... }]
    ]
  }
}
```

### Supabase Edge Function 배포

```bash
# Supabase CLI 설치
npm install -g supabase

# Edge Function 배포 (2개)
supabase functions deploy check-24h-push
supabase functions deploy emergency-48h

# 환경 변수 설정
supabase secrets set SUPABASE_URL=your_url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key

# CoolSMS 환경 변수 (emergency-48h용)
supabase secrets set COOLSMS_API_KEY=your_api_key
supabase secrets set COOLSMS_API_SECRET=your_api_secret
supabase secrets set COOLSMS_SENDER_PHONE=01012345678
```

### Cron Job 설정 (자동 알림 발송)

Supabase Dashboard > Database > Cron Jobs:

```sql
-- 1. 24시간 푸시 알림 (5분마다 실행, 정밀 체크)
SELECT cron.schedule(
  'check-24h-push-every-5min',
  '*/5 * * * *',  -- 5분마다
  $$
  SELECT net.http_post(
    url:='https://[YOUR-PROJECT].supabase.co/functions/v1/check-24h-push',
    headers:='{"Authorization": "Bearer [SERVICE_ROLE_KEY]"}'::jsonb
  ) as request_id;
  $$
);

-- 2. 48시간 긴급 문자 발송 (매일 오전 9시)
SELECT cron.schedule(
  'emergency-sms-daily-9am',
  '0 9 * * *',  -- 매일 오전 9시
  $$
  SELECT net.http_post(
    url:='https://[YOUR-PROJECT].supabase.co/functions/v1/emergency-48h',
    headers:='{"Authorization": "Bearer [SERVICE_ROLE_KEY]"}'::jsonb
  ) as request_id;
  $$
);
```

## 📱 배포

### EAS Build

```bash
# EAS CLI 설치
npm install -g eas-cli

# EAS 로그인
eas login

# Android 빌드
eas build --platform android

# iOS 빌드 (Mac 필요)
eas build --platform ios

# 앱 스토어 제출
eas submit
```

## 🎨 디자인 원칙

### "Senior-Friendly" 디자인
- ✅ **High Contrast**: 흰 배경 + 검은 텍스트
- ✅ **Large Text**: 최소 16px, 버튼 텍스트 36px
- ✅ **Simple UI**: 복잡하지 않은 단순한 인터페이스
- ✅ **Big Buttons**: 300x300px 대형 원형 버튼

---

## 🧪 테스트 시나리오

### 출석 로직 테스트

| 시나리오 | 기대 동작 | 상태 |
|---------|-----------|------|
| **신규 가입** | 빨간 버튼 ("생존 신고") | ✅ |
| **출석 버튼 클릭** | 초록색 버튼 ("완료") + Alert | ✅ |
| **앱 재시작 (같은 날)** | 초록색 유지 | ✅ |
| **다음날 앱 실행** | 빨간 버튼으로 리셋 | ✅ |
| **DB 에러 발생** | 빨간 버튼 (안전한 기본값) | ✅ |
| **네트워크 끊김** | 빨간 버튼 + 에러 로그 | ✅ |

### 알림 시스템 테스트

| 조건 | 알림 타입 | 발송 주기 |
|-----|----------|-----------|
| 24시간 미접속 | 푸시 알림 (본인) | 5분마다 (1회만) |
| 48시간 미접속 | SMS (보호자) | 매일 오전 9시 |

## 🔐 보안

### 인증 시스템
- ✅ **Supabase Auth 기반 전화번호 인증**
  - 전화번호 → 이메일/비밀번호 자동 생성
  - `signInWithPassword` / `signUp` 자동 처리
  - 세션 기반 인증으로 RLS 정책 자동 적용

### 데이터 보호
- 🔒 **RLS (Row Level Security) 활성화**
  - 로그인한 유저는 자기 데이터만 접근 가능
  - `auth.uid()` 기반 정책으로 완벽한 격리
- 🔑 **SERVICE_ROLE_KEY**: Edge Function에서만 사용 (모든 데이터 접근 가능)
- 📱 **ANON_KEY**: 클라이언트 앱에서 사용 (RLS 정책 적용)

## 🤝 기여

Pull Request는 언제나 환영합니다!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능합니다.

## 👨‍💻 개발자

**Imeanstar** - [GitHub](https://github.com/Imeanstar)

## 🙏 감사의 말

이 프로젝트는 혼자 사는 어르신들의 안전을 위해 만들어졌습니다.
작은 기술이 큰 안심을 만들 수 있기를 바랍니다. 💙

---

**Project Repository**: https://github.com/Imeanstar/musosig
