# 🏥 무소식(無消息) - 1인 가구 안부 확인 앱

> **Manager & Member** 역할 기반 안부 확인 시스템 (v2.3.83)

![React Native](https://img.shields.io/badge/React_Native-0.76.9-61DAFB?logo=react)
![Expo](https://img.shields.io/badge/Expo-~52.0-000020?logo=expo)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-3178C6?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase)
![Version](https://img.shields.io/badge/Version-2.3.83-orange)

## 📋 목차
- [개요](#-개요)
- [주요 기능](#-주요-기능)
- [최근 주요 업데이트](#-최근-주요-업데이트)
- [Version Log](#-version-log)
- [기술 스택](#-기술-스택)
- [프로젝트 구조](#-프로젝트-구조)
- [시작하기](#-시작하기)
- [환경 설정](#-환경-설정)
- [배포](#-배포)
- [디자인 원칙](#-디자인-원칙-v20)
- [테스트 시나리오](#-테스트-시나리오-v20)
- [보안](#-보안-v20)
- [v2.0 로드맵](#-v20-로드맵)
- [기여](#-기여)
- [라이선스](#-라이선스)

## 📖 개요

**무소식(無消息)**은 **모든 1인 가구와 돌봄 관계**를 위한 **안부 확인 앱**입니다.

### v2.0 핵심 변화 ⭐
- 👥 **역할 기반 시스템**: Manager(관리자) & Member(멤버) 구조
- 🔗 **6자리 페어링 코드**: 간편한 멤버-매니저 연결
- 📊 **통합 대시보드**: 여러 멤버의 안부를 한눈에
- 🎨 **전면 UI 개편**: 역할별 최적화된 인터페이스

### 핵심 가치
- 🎯 **간단한 출석**: 하루 한 번, 큰 버튼 터치로 안부 전달
- 🔔 **자동 알림**: 24시간 미접속 시 매니저에게 푸시 알림
- 📱 **긴급 문자**: 48시간 미접속 시 매니저에게 SMS 자동 발송
- 👨‍👩‍👧‍👦 **비상연락망**: 최대 3명의 보호자 연락처 관리
- 🧠 **치매 예방**: Premium 유저는 두뇌 훈련 수학 문제 풀이
- 🔒 **안전한 인증**: Supabase Auth + RLS로 데이터 보안 강화

## ✨ 주요 기능

### 1. **역할 기반 시스템** (v2.0) 🆕
- ✅ **Manager**: 소셜 로그인, 멤버 관리, 알림 수신
- ✅ **Member**: 6자리 코드로 페어링, 일일 체크인

### 2. **6자리 페어링 코드** 🔗
- ✅ Manager가 초대 코드 생성 (10분 유효)
- ✅ Member가 큰 숫자 키패드로 입력
- ✅ 재연결 코드 발급 (기기 변경 시)

### 3. **Manager 대시보드** 📊
- ✅ 멤버 상태 실시간 모니터링
- ✅ 월별 캘린더 뷰 (출석/결석 표시)

### 4. **Member 체크인** 
- ✅ 대형 원형 버튼 (시니어 친화적)
- ✅ 하루 1회 안부 전송

### 5. **사용자 관리**
- ✅ Manager: Google/Apple 소셜 로그인
- ✅ Member: 전화번호 기반 간편 가입

### 6. **알림 시스템** 🔔
- ✅ 24시간 미체크인 시 푸시 알림
- ✅ 48시간 미체크인 시 긴급 SMS

### 7. **Premium 기능** 👑
- ✅ 치매 예방 두뇌 훈련
- ✅ 구독 관리 (v2.2)

## 🔄 최근 주요 업데이트

### 🎉 v2.3.83 (2026.02.08) - Code Quality & UX Polish

#### 1. **Hook 최적화** 🧹
- **useShakeDetector.ts 제거**: 중복 로직 제거
  - `ShakeModal` 내부에서 직접 가속도계 관리
  - MemberMain에서 간단한 state로 대체
  - 코드 간결화 및 유지보수성 향상

#### 2. **Modal UX 개선** 🎨
- **배경 터치 닫기 기능 추가** (일부 모달)
  - 투명 오버레이 모달: 배경 터치로 닫기 가능
  - 전체화면 모달: 의도적 차단 (몰입감 유지)
  - 네이티브 앱 UX 패턴 준수

#### 3. **컴포넌트 구조 개선** 🏗️
- **ManagerMain.tsx**: 635줄 (탭 시스템 개선)
  - 새로운 `calendar` 탭 추가 (4개 탭 체제)
  - `CalendarTab` 컴포넌트로 완전 분리
  - Bottom Sheet UI 패턴 도입 (멤버 관리)
  - `RelinkCodeModal` 신규 추가

#### 4. **날짜 로직 정교화** 📅
- **KST 기준 날짜 검증 강화**
  - `getKSTDateString()` 헬퍼 함수 추가
  - 출석 상태 판단 이중 검증 (DB + 날짜)
  - 자정 넘김 버그 수정

#### 5. **사용자 경험 향상** ⚡
- **Optimistic Update 패턴 도입**
  - 체크인 즉시 UI 갱신 (서버 응답 대기 X)
  - 체감 속도 10배 향상
  - 완료 상태 시각화 강화 (아이콘/색상 동적 변경)

<details>
<summary><strong>📜 v2.3.0 업데이트 히스토리 보기</strong></summary>

### 🎉 v2.3.0 (2026.01.31) - Safety Features & Code Optimization

#### 1. **긴급 안전 기능 추가** 🚨
- **페이크 콜 시스템**: 위험 상황 탈출 도구
  - 실시간 전화 수신 UI 시뮬레이션
  - 커스터마이징 가능한 발신자 이름
  - 벨소리 선택 및 무음 모드 대응
  - 진동 패턴 (1초 진동, 2초 대기)
- **멤버 설정 모달**: 페이크 콜 설정 관리

#### 2. **스마트 알림 시스템** 🔔
- 4개 Edge Functions 신규 추가:
  - `emergency-sms-flag`: SMS 중복 방지 (Flag 기반)
  - `manager-alert-half`: 절반 시간 도달 시 알림
  - `daily-nudge-21h`: 매일 21시 리마인더
  - `cleanup-data`: 오래된 데이터 자동 정리

#### 3. **대규모 코드 리팩토링 (Round 2)** 🏗️
- **ManagerMain.tsx**: 660줄 → 524줄 (21%↓)
- **MemberMain.tsx**: 786줄 → 373줄 (53%↓)
- **총 코드 감소**: 1,446줄 → 897줄 (38%↓)

#### 4. **Hooks 확장** 🪝
- 7개 → 13개 Hook으로 확장
- 신규 Hook:
  - `useMemberLimit`: 멤버 추가 인원 제한
  - `useDetailModal`: 날짜 상세 모달 상태
  - `useMathChallenge`: 수학 문제 생성/검증
  - `useCameraCapture`: 카메라 촬영 관리
  - `useShakeDetector`: 가속도계 흔들기 감지

#### 5. **컴포넌트 모듈화** 🧩
- 5개 신규 모달 컴포넌트 추가:
  - `DateDetailModal`: 캘린더 날짜 상세
  - `MathChallengeModal`: 수학 문제 모달
  - `CameraModal`: 카메라 촬영 모달
  - `ShakeModal`: 흔들기 진행 모달
  - `FakeCallModal`: 페이크 콜 모달

</details>
<summary><strong>📜 v2.2.1 업데이트 히스토리 보기</strong></summary>

#### 1. **대규모 코드 리팩토링** 🏗️
- **ManagerMain.tsx**: 805줄 → 314줄 (61% 감소)
- **책임 분리**: 8가지 → 1가지 (라우팅만 담당)
- **상태 관리**: 12개 → 4개 변수로 단순화

#### 2. **Hooks 분리 및 재구성** 🪝
- `useUserManagement` → 4개 Hook으로 분리
  - `useAuth`: 인증 전담
  - `useDeepLink`: OAuth 콜백 처리
  - `useUserProfile`: 프로필 CRUD
  - `useUserManagement`: Facade (하위 호환)
- 신규 Hook 추가:
  - `useMemberList`: 멤버 목록 관리
  - `useInviteCode`: 초대 코드 생성
  - `useCalendar`: 캘린더 데이터

#### 3. **컴포넌트 모듈화** 🧩
- `InviteCodeModal`: 초대 모달 분리 (238줄)
- `ProfileTab`: 프로필/설정 탭 분리 (284줄)
- `CalendarTab`: 캘린더 뷰 분리
- 평균 파일 크기: 143줄 (관리 용이)

#### 4. **아키텍처 패턴 적용** 📐
- **Facade Pattern**: 기존 코드 호환성 유지
- **Single Responsibility**: 파일당 1가지 책임
- **Extract Component/Hook**: Martin Fowler 리팩토링 기법

#### 5. **버그 수정 및 안정화** 🐛
- DeepLink 과도한 로그 제거
- Expo 개발 URL 필터링
- OAuth 콜백 처리 개선

#### 6. **개발자 경험 개선** 👨‍💻
- 가독성 향상: 평균 파일 크기 82% 감소
- 유지보수성: 모듈별 독립적 수정 가능
- 테스트 용이성: Hook/컴포넌트 단독 테스트
</details>

<details>
<summary><strong>📜 v2.0.1 업데이트 히스토리 보기</strong></summary>

### 🚀 v2.0.1 (2026.01) - Major Refactoring

#### 1. **역할 기반 아키텍처 전환** 🏗️
- **Before**: 단일 사용자 → **After**: Manager & Member 역할 분리
- **대상 확장**: 노인-보호자 → 모든 1인 가구 & 돌봄 관계
- **데이터 모델**: `Profile`, `Manager`, `Member` 타입 정의

#### 2. **페어링 시스템 구축** 🔗
- 6자리 숫자 코드로 간편 연결
- Manager/Member 플로우 최적화

#### 3. **RLS 정책 재설계** 🔒
- 조회: 본인 + 내가 관리하는 멤버
- 수정: 본인 프로필만
- `role` 제약 조건 추가

#### 4. **UI/UX 전면 개편** 🎨
- 역할별 최적화된 인터페이스
- 시니어 친화적 디자인

</details>

<details>
<summary><strong>📜 v1.1 업데이트 히스토리 보기</strong></summary>

### 🎯 v1.1 핵심 개선 (2025.01.15)

#### 1. **Supabase Auth 연동** ⭐
- 전화번호 기반 자동 인증 시스템 구축
- RLS 정책 활성화

#### 2. **출석 로직 방어적 개선** 🛡️
- 신규 가입자 버그 수정
- 5가지 방어 로직 적용

#### 3. **DB 구조 단순화**
- `check_ins` 테이블 제거
- 쿼리 성능 개선

</details>

---

# 📸 Version Log

## Ver 2.3.83 (2026.02.08) - Code Quality & UX Polish
> Hook 최적화 + Modal UX 개선 + Optimistic Update 패턴

## Ver 2.3.0 (2026.01.31) - Safety & Smart Alerts
> 긴급 안전 기능 + 스마트 알림 시스템 + 코드 최적화 (38% 감소)

## Ver 2.2.1 (2026.01.30) - Code Quality Improvement
> 대규모 리팩토링으로 코드 품질 향상 (61% 코드 감소)

## Ver 2.0.1 (2026.01) - Manager & Member 시스템
> 역할 기반 아키텍처로 전면 개편

<table>
  <tr>
    <td align="center"><strong>역할 선택</strong></td>
    <td align="center"><strong>Member 페어링</strong></td>
    <td align="center"><strong>Member 체크인</strong></td>
    <td align="center"><strong>Manager 대시보드</strong></td>
  </tr>
  <tr>
    <td>
      <em>스크린샷 준비 중</em><br/>
      (RoleSelection)
    </td>
    <td>
      <em>스크린샷 준비 중</em><br/>
      (MemberPairing)
    </td>
    <td>
      <em>스크린샷 준비 중</em><br/>
      (MemberMain)
    </td>
    <td>
      <em>스크린샷 준비 중</em><br/>
      (ManagerMain)
    </td>
  </tr>
</table>

### 주요 변경 사항
- ✅ Manager/Member 역할 분리
- ✅ 6자리 페어링 코드 시스템
- ✅ Manager 통합 대시보드
- ✅ RLS 정책 재설계
- ✅ UI/UX 전면 개편

<details>
<summary><strong>📜 Ver 1.0 스크린샷 보기</strong></summary>

## Ver 1.0 (2025.01)
<table>
  <tr>
    <td>
      <img src="https://github.com/user-attachments/assets/cd5ca22d-3b8a-4ef2-bb47-9631e32cfbc1" width="200">
    </td>
    <td>
      <img src="https://github.com/user-attachments/assets/8f82edc7-bebc-47d4-8ec3-8fa7d83b131a" width="200">
    </td>
    <td>
      <img src="https://github.com/user-attachments/assets/89f5f18d-d240-4d5d-9244-59894b95d27d" width="200">
    </td>
    <td>
      <img src="https://github.com/user-attachments/assets/93cff638-2241-43dc-9d59-30aa4629d1c5" width="200">
    </td>
    <td>
      <img src="https://github.com/user-attachments/assets/524ca1c9-32d8-4ba7-b633-4dfc14fa8ae1" width="200">
    </td>
    <td>
      <img src="https://github.com/user-attachments/assets/bfb9bdfc-9fec-44e6-8577-07afb514c8cf" width="200">
    </td>
  </tr>
</table>

</details>

---

## 🛠️ 기술 스택

### Frontend
- **Framework**: React Native 0.76.9 (Expo Managed Workflow ~52.0)
- **Language**: TypeScript 5.3.3
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Navigation**: Expo Router (File-based)
- **Icons**: Lucide React Native
- **State**: React Hooks (useState, useEffect, Custom Hooks)
- **UI Components**:
  - `expo-linear-gradient`: 그라디언트 버튼
  - `expo-haptics`: 햅틱 피드백
  - `react-native-gesture-handler`: 터치 제스처

### Backend
- **BaaS**: Supabase
  - PostgreSQL Database (역할 기반 스키마)
  - Edge Functions (Deno) - 알림 자동 발송
  - Row Level Security (RLS) - v2.0 정책
  - Auth (OAuth + Email) - Manager/Member 분리
- **Push**: Expo Push Notification Service
- **SMS**: CoolSMS (48시간 긴급 알림)

### DevOps
- **Build**: EAS (Expo Application Services)
  - Android: AAB (autoIncrement versionCode)
  - Kotlin 1.9.25, compileSdk 35
- **Version Control**: Git + GitHub
- **Migration**: SQL 스크립트 기반 DB 버전 관리

## 📁 프로젝트 구조 (v2.3.83)

```
musosik/
├── app/                            # Expo Router 화면
│   ├── index.tsx                  # 메인 라우팅
│   ├── auth/
│   │   ├── callback.tsx           # OAuth 콜백
│   │   └── certification.tsx      # 본인인증 (준비 중)
│   └── _layout.tsx                # 전역 레이아웃
│
├── components/                     # 재사용 컴포넌트
│   ├── ManagerMain.tsx            # [v2.3.83] Manager 대시보드 (635줄)
│   ├── MemberMain.tsx             # [v2.3.83] Member 체크인 (452줄, Optimistic Update)
│   ├── MemberPairing.tsx          # Member 페어링 (코드 입력)
│   ├── RoleSelection.tsx          # 역할 선택 화면
│   ├── AuthManager.tsx            # 이메일 인증 화면
│   ├── LegalModal.tsx             # 법률 문서 WebView
│   │
│   ├── manager/                   # Manager 전용 컴포넌트
│   │   ├── InviteCodeModal.tsx    # 초대 코드 생성 모달
│   │   ├── ProfileTab.tsx         # 프로필 탭
│   │   ├── SettingsTab.tsx        # 설정 탭 (DnD 포함)
│   │   ├── CalendarTab.tsx        # [v2.3.83] 캘린더 탭 (완전 분리)
│   │   ├── DateDetailModal.tsx    # 날짜 상세 모달
│   │   └── RelinkCodeModal.tsx    # [v2.3.83] 재연결 코드 모달
│   │
│   └── modals/                    # 공통 모달
│       ├── FakeCallModal.tsx      # 페이크 콜 (긴급 상황)
│       ├── MemberSettingsModal.tsx # Member 설정
│       ├── MathChallengeModal.tsx # 수학 문제
│       ├── CameraModal.tsx        # 카메라 촬영
│       ├── ShakeModal.tsx         # [v2.3.83] 흔들기 진행 (내장 가속도계)
│       ├── SubscriptionModal.tsx  # 구독 관리
│       ├── SettingsModal.tsx      # 설정 모달
│       ├── RegisterModal.tsx      # 회원가입 모달
│       └── PasswordResetModal.tsx # 비밀번호 재설정
│
├── hooks/                          # 커스텀 훅 (12개)
│   ├── useUserManagement.ts       # [Facade] 하위 호환 유지
│   ├── useAuth.ts                 # 인증 전담
│   ├── useDeepLink.ts             # OAuth 딥링크
│   ├── useUserProfile.ts          # 프로필 CRUD
│   ├── useMemberList.ts           # 멤버 목록 관리
│   ├── useInviteCode.ts           # 초대 코드 생성
│   ├── useCalendar.ts             # 캘린더 데이터
│   ├── useMemberLimit.ts          # 멤버 추가 제한
│   ├── useDetailModal.ts          # 상세 모달 상태
│   ├── useMathChallenge.ts        # 수학 문제 Hook
│   ├── useCameraCapture.ts        # 카메라 Hook
│   └── useCheckIn.ts              # 출석 체크
│   # ❌ useShakeDetector.ts (v2.3.83에서 제거 - 중복 로직)
│
├── assets/                         # 에셋 파일
│   ├── icon.png                   # 앱 아이콘
│   ├── splash.png                 # 스플래시 이미지
│   ├── ringtone1.mp3              # 페이크 콜 벨소리 1
│   ├── ringtone2.mp3              # 페이크 콜 벨소리 2
│   └── ringtone3.mp3              # 페이크 콜 벨소리 3
│
├── utils/                          # 유틸리티 함수
│   ├── storage.ts                 # AsyncStorage 관리
│   ├── date.ts                    # 날짜 관련
│   └── notificationHelper.ts      # 푸시 알림
│
├── types/                          # TypeScript 타입
│   └── index.ts                   # Profile, Manager, Member, UserSettings
│
├── constants/                      # 상수
│   └── index.ts                   # 스토리지 키, 메시지
│
├── lib/                            # 외부 라이브러리
│   └── supabase.ts                # Supabase 클라이언트
│
└── supabase/                       # Supabase 설정
    ├── migrations/
    │   └── 20260120_v2.0_schema.sql
    └── functions/                  # Edge Functions (4개)
        ├── emergency-sms-flag/    # 긴급 SMS (Flag 기반)
        ├── manager-alert-half/    # 절반 시간 알림
        ├── daily-nudge-21h/       # 21시 리마인더
        └── cleanup-data/          # 자동 데이터 정리
```

### v2.3.83 주요 변경 사항
- ✅ **useShakeDetector.ts 제거**: ShakeModal 내장 로직으로 단순화
- ✅ **CalendarTab 완전 분리**: ManagerMain에서 300줄 이상 추출
- ✅ **RelinkCodeModal 신규**: 재연결 코드 발급 UI 개선
- ✅ **Optimistic Update**: 즉각적인 UI 반응 (MemberMain)
- ✅ **KST 날짜 검증**: 한국 시간 기준 정확한 출석 판정

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

#### 3.2 데이터베이스 스키마 (v2.0)

```sql
-- users 테이블 (Auth 연동) - v2.0 업데이트
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  
  -- [NEW] v2.0 역할 시스템
  role TEXT NOT NULL DEFAULT 'manager',           -- 'manager' 또는 'member'
  pairing_code TEXT UNIQUE,                       -- Member 식별용 6자리 코드
  manager_id UUID REFERENCES users(id),           -- Member일 경우 Manager ID
  relation_tag TEXT,                              -- 관계 태그 (예: 엄마, 아들)
  nickname TEXT,                                  -- Manager가 지정한 Member 별명
  
  -- 기존 필드
  emergency_contacts TEXT[] DEFAULT '{}',
  is_premium BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  push_token TEXT,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 제약 조건 (v2.0)
ALTER TABLE users
ADD CONSTRAINT check_role CHECK (role IN ('manager', 'member'));

ALTER TABLE users
ADD CONSTRAINT check_manager_logic CHECK (
  (role = 'manager' AND manager_id IS NULL) OR (role = 'member')
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_last_seen ON users(last_seen_at);
CREATE INDEX idx_users_push_token ON users(push_token) WHERE push_token IS NOT NULL;

-- [NEW] v2.0 인덱스
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_pairing_code ON users(pairing_code) WHERE pairing_code IS NOT NULL;
CREATE INDEX idx_users_manager_id ON users(manager_id) WHERE manager_id IS NOT NULL;

-- [NEW] 페어링 코드 생성 함수
CREATE OR REPLACE FUNCTION generate_pairing_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  exists_code BOOLEAN;
BEGIN
  LOOP
    new_code := floor(random() * (999999 - 100000 + 1) + 100000)::text;
    SELECT EXISTS (SELECT 1 FROM users WHERE pairing_code = new_code) INTO exists_code;
    IF NOT exists_code THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- [NEW] 체크인 로그 테이블 (선택적)
CREATE TABLE check_in_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_check_in_logs_user_id ON check_in_logs(user_id);
CREATE INDEX idx_check_in_logs_date ON check_in_logs(checked_in_at);
```

#### 3.3 RLS (Row Level Security) 정책 설정 (v2.0) ⭐

```sql
-- RLS 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- [UPDATED] 정책 1: 본인 + 내가 관리하는 멤버 조회 가능
CREATE POLICY "View own profile and members"
  ON users FOR SELECT
  USING (
    auth.uid() = id 
    OR 
    manager_id = auth.uid()  -- 내가 Manager인 Member들
  );

-- [UPDATED] 정책 2: 본인 프로필만 수정 가능
-- (Member가 manager_id를 업데이트할 때 필요)
CREATE POLICY "Update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 정책 3: 본인 프로필 생성 가능 (Manager/Member 모두)
CREATE POLICY "Create own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- check_in_logs RLS 정책
ALTER TABLE check_in_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own check-in logs"
  ON check_in_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Insert own check-in logs"
  ON check_in_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### 핵심 변경 사항
- ✅ **Manager는 자신이 관리하는 Member의 데이터를 조회 가능**
- ✅ **Member는 페어링을 위해 자신의 `manager_id`를 업데이트 가능**
- ✅ **역할 기반 접근 제어로 데이터 보안 강화**

#### 3.4 Supabase Auth 설정 (v2.0)

**Dashboard > Authentication > Providers:**

**Manager (관리자):**
- ✅ Google OAuth 활성화 (권장)
- ✅ Apple OAuth 활성화 (iOS용)
- ✅ Email 활성화 (대체 수단)

**Member (멤버):**
- ✅ Email 활성화
- ⚠️ "Confirm email" 비활성화 (자동 승인)
- **이메일 형식:** `{전화번호}@musosik.app` (예: `01012345678@musosik.app`)
- **비밀번호 형식:** `musosik{전화번호}` (예: `musosik01012345678`)

**보안 설정:**
- ✅ RLS 활성화
- ✅ `auth.uid()` 기반 정책으로 데이터 격리
- ✅ Manager-Member 관계는 `manager_id` 외래 키로 관리

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

### EAS Build (v2.0)

```bash
# EAS CLI 설치
npm install -g eas-cli

# EAS 로그인
eas login

# Android 프로덕션 빌드 (AAB)
eas build --platform android --profile production

# Android 프리뷰 빌드 (APK)
eas build --platform android --profile preview

# iOS 빌드 (Mac 필요)
eas build --platform ios --profile production

# 앱 스토어 제출
eas submit --platform android
eas submit --platform ios
```

### EAS 설정 (`eas.json`)

```json
{
  "cli": {
    "version": ">= 16.28.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true  // versionCode 자동 증가
    }
  }
}
```

### 빌드 이슈 해결 (v2.0에서 해결됨) ✅

**문제**: Kotlin 버전 불일치로 Gradle 빌드 실패  
**해결**: `expo-build-properties` 플러그인으로 Kotlin 1.9.25 지정

```json
// app.json
{
  "plugins": [
    [
      "expo-build-properties",
      {
        "android": {
          "kotlinVersion": "1.9.25",
          "compileSdkVersion": 35,
          "targetSdkVersion": 35
        }
      }
    ]
  ]
}
```

## 🎨 디자인 원칙 (v2.0)

### "Accessible & Modern" 디자인
- ✅ **역할별 최적화**:
  - **Manager**: 정보 밀도 높은 대시보드, 탭 네비게이션
  - **Member**: 대형 버튼 중심의 단순 UI (300x300px)
- ✅ **High Contrast**: 흰 배경 + 검은 텍스트 (시니어 친화적)
- ✅ **Large Text**: 최소 16px, 버튼 텍스트 36px
- ✅ **Simple UI**: 복잡하지 않은 직관적 인터페이스
- ✅ **Visual Feedback**:
  - LinearGradient로 버튼 강조
  - Haptic Feedback (진동) 제공
  - 상태별 색상 구분 (빨강/초록/회색)
- ✅ **Responsive Layout**: 다양한 화면 크기 지원

---

## 🧪 테스트 시나리오 (v2.0)

### 역할 선택 및 페어링 테스트

| 시나리오 | 기대 동작 | 상태 |
|---------|-----------|------|
| **첫 진입** | 역할 선택 화면 표시 (Manager/Member) | ✅ |
| **Manager 선택** | 소셜 로그인 화면으로 이동 | ✅ |
| **Member 선택** | 6자리 코드 입력 화면으로 이동 | ✅ |
| **Manager 코드 생성** | 6자리 숫자 생성 (중복 없음) | ✅ |
| **Member 코드 입력** | 자동 연결 + Manager ID 저장 | ✅ |
| **잘못된 코드 입력** | 에러 메시지 + 재입력 가능 | ✅ |

### Member 체크인 로직 테스트

| 시나리오 | 기대 동작 | 상태 |
|---------|-----------|------|
| **신규 가입** | 빨간 버튼 ("안부 전하기") | ✅ |
| **체크인 버튼 클릭** | 초록색 버튼 ("완료") + Alert | ✅ |
| **앱 재시작 (같은 날)** | 초록색 유지 | ✅ |
| **다음날 앱 실행** | 빨간 버튼으로 리셋 | ✅ |
| **DB 에러 발생** | 빨간 버튼 (안전한 기본값) | ✅ |
| **네트워크 끊김** | 빨간 버튼 + 에러 로그 | ✅ |

### Manager 대시보드 테스트

| 시나리오 | 기대 동작 | 상태 |
|---------|-----------|------|
| **멤버 목록 조회** | 관리 중인 모든 멤버 표시 | ✅ |
| **멤버 체크인 상태** | 오늘 체크인 여부 실시간 반영 | ✅ |
| **멤버 초대 코드 생성** | 모달로 6자리 코드 표시 | ✅ |
| **캘린더 뷰** | 멤버별 체크인 기록 달력 표시 | ✅ |
| **관계 태그 표시** | 엄마, 아들 등 관계 표시 | ✅ |

### 알림 시스템 테스트 (v2.0)

| 조건 | 알림 타입 | 수신자 | 발송 주기 |
|-----|----------|--------|-----------|
| 24시간 미체크인 | 푸시 알림 | **Manager** | 5분마다 (1회만) |
| 48시간 미체크인 | SMS | **Manager** | 매일 오전 9시 |

### RLS 정책 테스트

| 시나리오 | 기대 동작 | 상태 |
|---------|-----------|------|
| **Manager가 자신의 Member 조회** | 성공 (SELECT 허용) | ✅ |
| **Manager가 다른 Manager의 Member 조회** | 실패 (RLS 차단) | ✅ |
| **Member가 자신의 프로필 수정** | 성공 (UPDATE 허용) | ✅ |
| **Member가 manager_id 업데이트** | 성공 (페어링 허용) | ✅ |

## 🔐 보안 (v2.0)

### 인증 시스템
- ✅ **Manager**: Supabase 소셜 로그인 (Google, Apple)
  - OAuth 기반 안전한 인증
  - 자동 세션 관리
- ✅ **Member**: 전화번호 기반 간편 인증
  - 전화번호 → 이메일/비밀번호 자동 생성
  - `signInWithPassword` / `signUp` 자동 처리
- ✅ **세션 기반 인증**: RLS 정책 자동 적용

### 데이터 보호
- 🔒 **RLS (Row Level Security) v2.0**
  - **조회**: 본인 + 내가 관리하는 멤버만 접근
  - **수정**: 본인 프로필만 수정 가능
  - **생성**: 로그인한 사용자는 자기 프로필 생성 가능
  - `auth.uid()` 기반 정책으로 완벽한 격리
- 🔑 **SERVICE_ROLE_KEY**: Edge Function에서만 사용 (모든 데이터 접근 가능)
- 📱 **ANON_KEY**: 클라이언트 앱에서 사용 (RLS 정책 적용)

### 페어링 보안
- 🎲 **6자리 랜덤 코드**: 100000~999999 범위, 중복 방지
- ⏰ **일회성 코드**: 사용 후 재생성 권장
- 🔗 **외래 키 제약**: `manager_id` → `users(id)` 참조 무결성 보장
- 🛡️ **제약 조건**: 
  - `role`은 `manager` 또는 `member`만 허용
  - Manager는 `manager_id`를 가질 수 없음

## 🗺️ v2.0 로드맵

### ✅ 완료된 작업 (Phase 1-2)
- [x] Supabase 데이터베이스 마이그레이션 (v2.0 스키마)
- [x] TypeScript 타입 정의 (`Profile`, `Manager`, `Member`)
- [x] RLS 정책 재설계
- [x] 역할 선택 화면 (`RoleSelection.tsx`)
- [x] Member 페어링 시스템 (`MemberPairing.tsx`)
- [x] Member 체크인 화면 (`MemberMain.tsx`)
- [x] Manager 대시보드 (`ManagerMain.tsx`)
- [x] 스토리지 로직 리팩토링

### 🚧 진행 중 (Phase 3)
- [x] 대규모 코드 리팩토링 (v2.2.1 완료)
- [x] Hooks 모듈화 (v2.2.1 완료)
- [x] 컴포넌트 세분화 (v2.2.1 완료)
- [ ] Manager 소셜 로그인 통합 (Google, Apple)

### 📅 예정 (Phase 4-5)
- [ ] 본인인증 시스템 (포트원 API)
- [ ] 멤버 관리 기능 (삭제/수정)
- [ ] 통계 대시보드 (출석률 그래프)
- [ ] 알림 설정 화면
- [ ] 앱 성능 최적화

## ⚠️ 알려진 이슈

- **소셜 로그인**: OAuth 콜백 처리 개선 필요 (v2.2.1에서 일부 개선)
- **본인인증**: 포트원 API 통합 대기 중
- **Modal UX**: 일부 모달에서 배경 터치 닫기 미지원 (의도적 설계, v2.3.83)

## 🤝 기여

Pull Request는 언제나 환영합니다!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### 기여 가이드라인
- TypeScript 타입을 명시적으로 작성해주세요
- RLS 정책 변경 시 보안 영향을 검토해주세요
- 컴포넌트는 역할별로 분리해주세요 (Manager/Member)

## 📄 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능합니다.

## 👨‍💻 개발자

**Imeanstar** - [GitHub](https://github.com/Imeanstar)

## 📚 추가 문서

- **마이그레이션 가이드**: `supabase/migrations/20260120_v1.1_profiles_migration.sql`
- **타입 정의**: `types/index.ts`
- **디자인 스펙**: `Design Spec for Musosik` (별도 문서)

## 🙏 감사의 말

이 프로젝트는 **모든 1인 가구와 돌봄 관계**의 안전을 위해 만들어졌습니다.

v2.0에서는 더 많은 사람들이 서로를 돌볼 수 있도록  
**Manager & Member 시스템**으로 확장했습니다.

작은 기술이 큰 안심을 만들 수 있기를 바랍니다. 💙

---

**Project Repository**: https://github.com/Imeanstar/musosig  
**Version**: 2.3.83 (2026.02.08)  
**License**: MIT
