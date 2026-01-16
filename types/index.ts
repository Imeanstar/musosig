// types/index.ts - 앱 전역 타입 정의
export interface UserInfo {
  user_id: string;
  name: string;
  phone: string;
  emergency_contacts: string[];
  is_premium: boolean;
  push_token?: string | null;
}

export interface MathProblem {
  num1: number;
  num2: number;
  answer: number;
}

export type LegalDocType = 'terms' | 'privacy';

export interface LegalDocument {
  type: LegalDocType;
  title: string;
  url: string;
}
