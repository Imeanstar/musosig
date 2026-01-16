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
- 🔔 **자동 알림**: 24시간 미접속 시 자동 안부 확인 알림
- 👨‍👩‍👧‍👦 **비상연락망**: 최대 3명의 보호자 연락처 관리
- 🧠 **치매 예방**: Premium 유저는 두뇌 훈련 수학 문제 풀이

## ✨ 주요 기능

### 1. **일일 생존 신고**
- ✅ 300x300px 대형 원형 버튼 (노인 친화적)
- ✅ 하루 1회 출석 체크
- ✅ 오늘 출석 여부 자동 확인 (새로고침 시 유지)

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
- ✅ 이용약관 (WebView)
- ✅ 개인정보처리방침 (WebView)
- ✅ 설정 화면에서 언제든지 확인 가능

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
        └── check-48h-inactivity/  # 24시간 미접속자 알림 Edge Function
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
-- users 테이블
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  emergency_contacts TEXT[] DEFAULT '{}',
  is_premium BOOLEAN DEFAULT false,
  push_token TEXT,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- check_ins 테이블
CREATE TABLE check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_last_seen ON users(last_seen_at);
CREATE INDEX idx_checkins_user_created ON check_ins(user_id, created_at);
```

#### 3.3 RLS (Row Level Security) 비활성화 (개발 단계)

```sql
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins DISABLE ROW LEVEL SECURITY;
```

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

# Edge Function 배포
supabase functions deploy check-48h-inactivity

# 환경 변수 설정
supabase secrets set SUPABASE_URL=your_url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key
```

### Cron Job 설정 (자동 알림 발송)

Supabase Dashboard > Database > Cron Jobs:

```sql
-- 매일 오전 9시에 24시간 미접속자 체크
SELECT cron.schedule(
  'daily-inactivity-check',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url:='https://[YOUR-PROJECT].supabase.co/functions/v1/check-48h-inactivity',
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

## 🔐 보안

- 🔒 Supabase RLS로 데이터 보호 (프로덕션 시 활성화 필요)
- 🔑 SERVICE_ROLE_KEY는 서버 사이드(Edge Function)에서만 사용
- 📱 클라이언트는 ANON_KEY만 사용

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
