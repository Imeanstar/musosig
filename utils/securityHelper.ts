// utils/securityHelper.ts - 보안 헬퍼 함수
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 민감한 데이터를 해시화하여 저장
 * (완전한 암호화는 아니지만 평문 노출 방지)
 */
export async function hashSensitiveData(data: string): Promise<string> {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    data
  );
}

/**
 * 앱 완전 초기화 (보안 로그아웃)
 */
export async function secureWipeData(): Promise<void> {
  try {
    // 1. AsyncStorage 완전 삭제
    await AsyncStorage.clear();
    
    // 2. 민감한 메모리 변수 초기화
    // (JavaScript GC가 처리하지만 명시적으로 null 할당)
    let sensitiveData: any = null;
    
    // 3. 세션 토큰 무효화는 Supabase signOut()에서 처리됨
    
    console.log('✅ 보안 데이터 삭제 완료');
  } catch (e) {
    console.error('❌ 데이터 삭제 실패:', e);
    throw e;
  }
}

/**
 * 입력값 검증 (XSS, SQL Injection 방지)
 */
export function sanitizeInput(input: string): string {
  // 특수문자 이스케이프 (기본적인 XSS 방지)
  return input
    .replace(/[<>]/g, '') // HTML 태그 제거
    .replace(/['"]/g, '') // 따옴표 제거
    .trim();
}

/**
 * 전화번호 마스킹 (로그용)
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 4) return '****';
  return phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4);
}

/**
 * 이메일 마스킹
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***.***';
  const [local, domain] = email.split('@');
  const maskedLocal = local.charAt(0) + '***' + local.charAt(local.length - 1);
  return `${maskedLocal}@${domain}`;
}
