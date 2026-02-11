// utils/logger.ts - 안전한 로깅 유틸리티
import { Platform } from 'react-native';

const IS_DEV = __DEV__;
const IS_PROD = !__DEV__;

/**
 * 개발 환경에서만 로그를 출력하고, 프로덕션에서는 완전히 제거됨
 */
export const logger = {
  log: (...args: any[]) => {
    if (IS_DEV) console.log(...args);
  },
  
  warn: (...args: any[]) => {
    if (IS_DEV) console.warn(...args);
  },
  
  error: (...args: any[]) => {
    if (IS_DEV) {
      console.error(...args);
    } else {
      // 프로덕션에서는 에러 모니터링 서비스로 전송 (예: Sentry)
      // Sentry.captureException(new Error(args.join(' ')));
    }
  },
  
  /**
   * 민감한 정보를 마스킹하여 로그 출력
   */
  secure: (message: string, sensitiveData: string) => {
    if (IS_DEV) {
      const masked = sensitiveData.replace(/\d(?=\d{4})/g, '*'); // 뒤 4자리만 표시
      console.log(`${message}: ${masked}`);
    }
  }
};

/**
 * 프로덕션 빌드에서 모든 console.* 제거
 * babel.config.js 또는 metro.config.js에서 설정:
 * 
 * plugins: [
 *   ["transform-remove-console", { "exclude": ["error", "warn"] }]
 * ]
 */
