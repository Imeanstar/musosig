# 🪝 Hooks 디렉토리 (Refactored)

## 📋 개요

이 디렉토리는 **마틴 파울러의 리팩토링 원칙**에 따라 재구성되었습니다:
- **단일 책임 원칙 (Single Responsibility Principle)**
- **관심사의 분리 (Separation of Concerns)**
- **Facade Pattern** (기존 코드 호환성 유지)

---

## 🗂️ 파일 구조

```
hooks/
├── useAuth.ts              # 인증 전담 (로그인, 회원가입, OAuth)
├── useDeepLink.ts          # 딥링크 처리 전담 (OAuth 콜백)
├── useUserProfile.ts       # 사용자 프로필 CRUD 전담
├── useUserManagement.ts    # 통합 Facade (기존 코드 호환)
├── useCheckIn.ts           # 출석 체크 로직
├── usePremium.ts           # 프리미엄 기능 (별도)
└── README.md               # 이 파일
```

---

## 📦 각 Hook의 책임

### 1️⃣ `useAuth.ts` - 인증 전담
**책임**: 사용자 인증 관련 로직만 처리

```typescript
const {
  isAuthLoading,
  loginWithEmail,      // 이메일 로그인
  signUpWithEmail,     // 이메일 회원가입
  performOAuth,        // 소셜 로그인 (Google, Kakao)
  logout,              // 로그아웃
} = useAuth();
```

**특징**:
- ✅ Supabase Auth API만 호출
- ✅ 세션 생성/삭제 담당
- ✅ 프로필 로드는 **하지 않음** (분리됨)

---

### 2️⃣ `useDeepLink.ts` - 딥링크 처리 전담
**책임**: OAuth 리다이렉트 URL 처리 및 세션 설정

```typescript
useDeepLink({
  onAuthSuccess: () => {
    // 로그인 성공 시 실행
  },
  onAuthError: (error) => {
    // 로그인 실패 시 실행
  },
  enableDebugAlerts: __DEV__, // 개발 모드에서만 Alert
});
```

**특징**:
- ✅ URL 파싱 및 토큰 추출
- ✅ `supabase.auth.setSession()` 호출
- ✅ 리스너 자동 등록/해제
- ✅ 디버깅 Alert 옵션 제공 (배포 시 false)

---

### 3️⃣ `useUserProfile.ts` - 사용자 프로필 CRUD
**책임**: 사용자 프로필 데이터 관리

```typescript
const {
  userInfo,
  setUserInfo,
  isProfileLoading,
  loadUserProfile,          // DB에서 프로필 로드
  updateSocialUserInfo,     // 소셜 유저 추가 정보 업데이트
  togglePremium,            // 프리미엄 상태 토글
  deleteAccount,            // 계정 삭제
  clearProfile,             // 프로필 클리어 (로그아웃 시)
} = useUserProfile();
```

**특징**:
- ✅ DB 쿼리 및 로컬 스토리지 동기화
- ✅ 푸시 토큰 자동 등록
- ✅ 폴백 로직 (DB 실패 시 로컬 스토리지)

---

### 4️⃣ `useUserManagement.ts` - 통합 Facade
**책임**: 기존 코드와의 호환성 유지 (Wrapper)

```typescript
const {
  userInfo,
  isLoading,
  loadUser,
  loginWithEmail,
  signUpWithEmail,
  performOAuth,
  togglePremium,
  resetAllData,
  updateSocialUserInfo,
  deleteAccount,
} = useUserManagement();
```

**특징**:
- ✅ **기존 컴포넌트 수정 없이 사용 가능**
- ✅ 내부적으로 `useAuth` + `useDeepLink` + `useUserProfile` 조합
- ✅ Facade Pattern 적용

---

## 🔄 Before vs After

### Before (349줄, 8가지 책임)
```typescript
// ❌ 모든 기능이 하나의 파일에 집중
useUserManagement() {
  // 인증
  // 딥링크
  // 프로필 로드
  // 프로필 업데이트
  // 푸시 토큰
  // 프리미엄
  // 계정 삭제
  // ...
}
```

### After (4개 파일, 책임 분리)
```typescript
// ✅ 책임별로 분리
useAuth()         // 인증 전담 (165줄)
useDeepLink()     // 딥링크 전담 (151줄)
useUserProfile()  // 프로필 전담 (226줄)
useUserManagement() // Facade (95줄)
```

---

## 🎯 리팩토링 원칙 적용

### 1. Extract Function (함수 추출)
- 각 기능을 독립된 함수로 분리

### 2. Extract Module (모듈 추출)
- 관련 함수들을 별도 Hook으로 분리

### 3. Single Responsibility Principle
- 각 Hook은 **하나의 명확한 목적**만 가짐

### 4. Facade Pattern
- 기존 코드 호환성을 위해 `useUserManagement`를 Facade로 유지

### 5. Dependency Injection
- 각 Hook은 독립적으로 사용 가능
- 필요한 경우에만 조합

---

## 🧪 테스트 용이성

### Before
```typescript
// ❌ 전체 useUserManagement를 모킹해야 함
jest.mock('./useUserManagement');
```

### After
```typescript
// ✅ 필요한 부분만 모킹
jest.mock('./useAuth');
jest.mock('./useUserProfile');
```

---

## 📈 이점

1. **가독성 향상**: 각 파일이 150-200줄으로 관리하기 쉬움
2. **재사용성**: 필요한 Hook만 import 가능
3. **테스트 용이**: 각 Hook을 독립적으로 테스트
4. **유지보수**: 변경 사항이 특정 Hook에만 영향
5. **확장성**: 새 기능 추가 시 새 Hook 생성만 하면 됨
6. **하위 호환**: 기존 코드 수정 불필요

---

## 💡 사용 예시

### 기존 컴포넌트 (수정 불필요)
```typescript
// ✅ 기존 코드 그대로 동작
const { userInfo, loginWithEmail } = useUserManagement();
```

### 새로운 컴포넌트 (선택적 사용)
```typescript
// ✅ 필요한 Hook만 사용 가능
const { loginWithEmail } = useAuth();
const { userInfo } = useUserProfile();
```

---

## 🚀 다음 단계

이제 다른 복잡한 컴포넌트도 동일한 원칙으로 리팩토링할 수 있습니다:
- `ManagerMain.tsx` → 여러 Hook으로 분리
- `MemberMain.tsx` → 단순화
- `AuthManager.tsx` → 로직 분리

---

## 📚 참고 자료

- [Martin Fowler - Refactoring](https://refactoring.com/)
- [React Hooks Best Practices](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
