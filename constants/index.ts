// constants/index.ts - 앱 전역 상수
import { LegalDocument } from '../types';

// 법률 문서 URL (TODO: 실제 노션 URL로 변경 필요)
export const LEGAL_DOCUMENTS: Record<'terms' | 'privacy', LegalDocument> = {
  terms: {
    type: 'terms',
    title: '이용약관',
    url: 'https://fossil-jackfruit-e76.notion.site/Musosik-2eabea82a55680c59934db2f27086e62?source=copy_link', // TODO: 노션 링크로 변경
  },
  privacy: {
    type: 'privacy',
    title: '개인정보처리방침',
    url: 'https://fossil-jackfruit-e76.notion.site/2eabea82a5568011aa71c3f7aaf4d19d?source=copy_link', // TODO: 노션 링크로 변경
  },
};

// 비상연락망 최대 인원
export const MAX_EMERGENCY_CONTACTS = 3;

// 수학 문제 난이도 설정
export const MATH_CHALLENGE = {
  MIN_NUMBER: 10,
  MAX_NUMBER: 99,
} as const;

// Alert 메시지
export const MESSAGES = {
  // 회원가입/로그인
  REGISTER_SUCCESS_NEW: '환영합니다!',
  REGISTER_SUCCESS_EXISTING: '다시 오셨군요!',
  REGISTER_ERROR_EMPTY: '이름과 전화번호를 모두 입력해주세요.',
  REGISTER_ERROR_FAILED: '등록 중 문제가 발생했습니다.',

  // 출석 체크
  CHECKIN_SUCCESS: '생존 신고 완료! 오늘도 건강하세요.',
  CHECKIN_ERROR: '저장 실패',

  // 비상연락망
  CONTACTS_MAX_REACHED: '최대 3명까지만 등록 가능합니다.',
  CONTACTS_SAVE_SUCCESS: '비상연락망이 저장되었습니다.',
  CONTACTS_SAVE_ERROR: '저장에 실패했습니다.',

  // Premium
  PREMIUM_ENABLED: '프리미엄 모드가 활성화되었습니다. 🌟',
  PREMIUM_DISABLED: '무료 모드로 전환되었습니다.',
  PREMIUM_ERROR: '설정 변경에 실패했습니다.',

  // 수학 문제
  MATH_INPUT_REQUIRED: '숫자를 입력해주세요.',
  MATH_WRONG_ANSWER: '틀렸습니다',
  MATH_TRY_AGAIN: '다시 시도해보세요! 💪',

  // 데이터 초기화
  RESET_CONFIRM_TITLE: '⚠️ 경고',
  RESET_CONFIRM_MESSAGE: '정말 모든 데이터를 삭제하고\n처음 화면으로 돌아가시겠습니까?',
  RESET_ERROR: '초기화 실패',
} as const;

// AsyncStorage 키
export const STORAGE_KEYS = {
  USER_ID: 'user_id',
  USER_NAME: 'user_name',
  USER_PHONE: 'user_phone',
  EMERGENCY_CONTACTS: 'emergency_contacts',
  IS_PREMIUM: 'is_premium',
  PUSH_TOKEN: 'push_token',
} as const;
