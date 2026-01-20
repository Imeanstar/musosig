// types/index.ts - 앱 전역 타입 정의 (v1.2)

// ============================================================
// 사용자 역할 및 프로필 타입
// ============================================================

/**
 * 사용자 역할 타입
 */
export type UserRole = 'manager' | 'member';

/**
 * 기본 프로필 인터페이스 (DB users 테이블과 매핑)
 */
export interface Profile {
  id: string;                         // Supabase Auth ID (기존 user_id -> id로 통일)
  role: UserRole;                     // 사용자 역할
  name: string;                       // 이름
  phone: string;                      // 전화번호
  
  // Member 전용 필드 (Manager는 null)
  pairing_code?: string | null;       // 6자리 페어링 코드
  manager_id?: string | null;         // 속한 Manager ID
  
  // 관계 메타데이터
  nickname?: string | null;           // 매니저가 멤버에게 붙인 별명
  relation_tag?: string | null;       // 관계 태그 (예: "가족", "친구")
  
  // 공통 필드
  push_token?: string | null;         // 푸시 알림 토큰
  last_seen_at?: string | null;       // 마지막 안부 신고 시간
  emergency_contacts?: string[];      // [보완] 비상연락망 (배열)
  
  // 기존 기능 유지 (선택사항)
  is_premium?: boolean;               // 프리미엄 회원 여부
  is_admin?: boolean;                 // 관리자 권한
  
  // 시스템 필드
  created_at?: string;                // 생성 시간
  updated_at?: string;                // 수정 시간
}

/**
 * Manager 타입 (관리자)
 */
export interface Manager extends Profile {
  role: 'manager';
  manager_id?: never;                 // Manager는 manager_id 불가
  pairing_code?: never;               // Manager는 pairing_code 불가
  members?: Member[];                 // 관리하는 멤버 목록 (조회 시 포함)
}

/**
 * Member 타입 (사용자)
 */
export interface Member extends Profile {
  role: 'member';
  pairing_code?: string | null;       // 6자리 코드
  manager_id?: string | null;         // 연결된 Manager ID
  manager?: Manager;                  // 연결된 Manager 정보
}

// ============================================================
// 하위 호환성을 위한 타입 별칭
// ============================================================

/**
 * @deprecated v1.0 호환용 - 이제부터는 user_id 대신 id를 사용하세요!
 */
export type UserInfo = Profile & {
  // 기존 코드 호환성을 위해 user_id를 id의 별칭으로 잠깐 살려둠 (나중에 제거 추천)
  user_id?: string; 
};

// ============================================================
// 기타 타입 정의
// ============================================================

/**
 * 수학 문제 (Premium 기능)
 */
export interface MathProblem {
  num1: number;
  num2: number;
  answer: number;
}

/**
 * 안부 기록 (Logs)
 */
export interface CheckInLog {
  id: number;
  member_id: string;
  created_at: string;
}

/**
 * 법률 문서 타입
 */
export type LegalDocType = 'terms' | 'privacy';

/**
 * 법률 문서 인터페이스
 */
export interface LegalDocument {
  type: LegalDocType;
  title: string;
  url: string;
}

// ============================================================
// 유틸리티 타입 (헬퍼)
// ============================================================

/**
 * Profile 생성 시 필요한 최소 필드
 */
export type CreateProfileInput = Pick<Profile, 'id' | 'role' | 'name' | 'phone'>;

/**
 * 타입 가드: Manager 여부 확인
 */
export function isManager(profile: Profile): profile is Manager {
  return profile.role === 'manager';
}

/**
 * 타입 가드: Member 여부 확인
 */
export function isMember(profile: Profile): profile is Member {
  return profile.role === 'member';
}