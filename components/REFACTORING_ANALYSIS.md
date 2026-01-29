# 🔍 ManagerMain.tsx 리팩토링 분석

## 📊 현재 상태

| 지표 | 값 | 평가 |
|------|-----|------|
| **총 라인 수** | 805줄 | ❌ 심각 (권장: 200-300줄) |
| **책임 개수** | 8개+ | ❌ 과다 (권장: 1-2개) |
| **상태 변수** | 12개 | ❌ 과다 (권장: 3-5개) |
| **useEffect** | 2개 | ✅ 양호 |
| **함수 개수** | 9개 | ⚠️ 주의 |
| **렌더링 분기** | 4개 (탭) | ⚠️ 복잡 |
| **스타일 정의** | 100+ 줄 | ❌ 과다 |

---

## 🚨 발견된 "Code Smells"

### 1. **Long Method** (긴 메서드)
```typescript
// 라인 225-693: 468줄의 거대한 return 문
return (
  <View>
    {/* 468줄의 JSX... */}
  </View>
);
```
**문제**: 렌더링 로직이 너무 길어서 이해하기 어려움

---

### 2. **Large Class** (거대한 클래스/컴포넌트)
805줄은 "God Component" 안티패턴의 전형적 사례

---

### 3. **Feature Envy** (기능 선망)
```typescript
// 31-54줄: 너무 많은 상태 관리
const [activeTab, setActiveTab] = useState(...);
const [members, setMembers] = useState(...);
const [selectedMember, setSelectedMember] = useState(...);
const [isLoading, setIsLoading] = useState(...);
const [showInviteModal, setShowInviteModal] = useState(...);
const [inviteCode, setInviteCode] = useState(...);
// ... 12개의 상태!
```
**문제**: 상태가 분산되어 관리가 어려움

---

### 4. **Divergent Change** (발산적 변경)
하나의 컴포넌트가 너무 많은 이유로 변경됨:
- 멤버 목록 UI 변경
- 캘린더 로직 변경
- 초대 모달 변경
- 프로필 탭 변경
- 설정 메뉴 변경

---

### 5. **Shotgun Surgery** (산탄총 수술)
초대 코드 기능을 수정하려면 여러 곳을 수정해야 함:
- 상태 (43-54줄)
- 생성 함수 (76-109줄)
- 모달 UI (584-686줄)

---

## 🎯 리팩토링 목표

### Before
```
ManagerMain.tsx (805줄)
└─ 모든 것이 한 파일에
```

### After
```
ManagerMain.tsx (120줄)
├─ hooks/
│  ├─ useMemberList.ts (멤버 목록 관리)
│  ├─ useInviteCode.ts (초대 코드 생성)
│  └─ useCalendar.ts (캘린더 로직)
└─ components/
   ├─ MemberListTab.tsx (멤버 목록 UI)
   ├─ MemberDetailTab.tsx (캘린더 UI)
   ├─ ProfileTab.tsx (프로필/설정 UI)
   └─ modals/
      └─ InviteCodeModal.tsx (초대 모달)
```

---

## 📋 책임 분리 계획

### 🎯 8가지 책임 식별

| # | 책임 | 현재 위치 | 이동 목표 |
|---|------|----------|----------|
| 1 | **멤버 목록 조회** | 148-183줄 | `useMemberList.ts` |
| 2 | **체크인 로그 조회** | 185-203줄 | `useCalendar.ts` |
| 3 | **초대 코드 생성** | 76-109줄 | `useInviteCode.ts` |
| 4 | **재연결 코드 생성** | 111-138줄 | `useInviteCode.ts` |
| 5 | **멤버 목록 UI** | 269-309줄 | `MemberListTab.tsx` |
| 6 | **캘린더 UI** | 312-410줄 | `MemberDetailTab.tsx` |
| 7 | **프로필/설정 UI** | 421-561줄 | `ProfileTab.tsx` |
| 8 | **초대 모달 UI** | 584-686줄 | `InviteCodeModal.tsx` |

---

## 🔧 리팩토링 기법 적용

### 1. **Extract Hook** (훅 추출)
비즈니스 로직을 커스텀 Hook으로 분리

### 2. **Extract Component** (컴포넌트 추출)
UI를 작은 컴포넌트로 분리

### 3. **Move Function** (함수 이동)
관련 함수를 적절한 Hook/컴포넌트로 이동

### 4. **Replace Conditional with Polymorphism**
탭 전환 로직을 컴포넌트 분리로 해결

---

## 🎨 리팩토링 우선순위

### 🔥 High Priority (즉시 필요)
1. ✅ **InviteCodeModal 분리** (100줄 줄임)
2. ✅ **ProfileTab 분리** (140줄 줄임)
3. ✅ **useMemberList Hook 추출** (상태 정리)

### ⚡ Medium Priority (권장)
4. ⚠️ **MemberListTab 분리** (40줄 줄임)
5. ⚠️ **MemberDetailTab 분리** (100줄 줄임)
6. ⚠️ **useCalendar Hook 추출**

### 💡 Low Priority (선택)
7. 📝 스타일 정의를 별도 파일로 분리
8. 📝 타입 정의를 types 폴더로 이동

---

## 📊 예상 효과

### Before vs After

| 지표 | Before | After | 개선율 |
|------|--------|-------|--------|
| **ManagerMain.tsx** | 805줄 | ~120줄 | **85%↓** |
| **책임 개수** | 8개 | 1개 | **87%↓** |
| **상태 변수** | 12개 | 3개 | **75%↓** |
| **파일 개수** | 1개 | 7개 | - |
| **평균 파일 크기** | 805줄 | ~115줄 | **85%↓** |

---

## 🚀 실행 계획

### Phase 1: 모달 분리 (30분)
- [ ] `InviteCodeModal.tsx` 생성
- [ ] 초대 코드 관련 상태/함수 이동
- [ ] ManagerMain에서 import

### Phase 2: 탭 컴포넌트 분리 (1시간)
- [ ] `MemberListTab.tsx` 생성
- [ ] `MemberDetailTab.tsx` 생성
- [ ] `ProfileTab.tsx` 생성

### Phase 3: Hook 추출 (1시간)
- [ ] `useMemberList.ts` 생성
- [ ] `useInviteCode.ts` 생성
- [ ] `useCalendar.ts` 생성

### Phase 4: 테스트 및 정리 (30분)
- [ ] 기능 동작 확인
- [ ] 불필요한 코드 제거
- [ ] 린트 오류 수정

**총 예상 시간**: 3시간

---

## 💬 Martin Fowler's Quote

> "Any fool can write code that a computer can understand.  
> Good programmers write code that humans can understand."

현재의 805줄 코드는 컴퓨터는 이해하지만,  
인간(개발자)이 이해하기 어렵습니다.

---

## ✅ 결론

**권장 사항**: 즉시 리팩토링 시작!

805줄은 유지보수성, 테스트 가능성, 재사용성 모든 면에서 문제입니다.  
Phase 1-2만 완료해도 **코드 품질이 크게 개선**됩니다.

"지금 리팩토링하지 않으면, 나중에는 더 어려워집니다."
