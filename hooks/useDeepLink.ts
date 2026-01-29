/**
 * useDeepLink.ts
 * 
 * 딥링크 및 OAuth 리다이렉트 처리 전담 Hook
 * - URL 파싱
 * - 토큰 추출 및 세션 설정
 * - 리스너 등록
 * 
 * @responsibility Deep Link & OAuth Callback
 */

import { useEffect } from 'react';
import { Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';

interface UseDeepLinkProps {
  onAuthSuccess?: () => void;
  onAuthError?: (error: string) => void;
  enableDebugAlerts?: boolean; // 디버깅용 Alert 활성화 여부
}

export const useDeepLink = ({
  onAuthSuccess,
  onAuthError,
  enableDebugAlerts = false, // 배포 시 false로 변경
}: UseDeepLinkProps) => {

  /**
   * URL에서 파라미터 추출 (# 또는 ? 형식 지원)
   */
  const extractParamsFromUrl = (url: string): Record<string, string> => {
    const params: Record<string, string> = {};

    // 1. 해시(#) 체크 - Supabase OAuth는 주로 # 사용
    const hashSplit = url.split('#');
    // 2. 쿼리(?) 체크
    const querySplit = url.split('?');

    const queryString = hashSplit.length > 1 
      ? hashSplit[1] 
      : (querySplit.length > 1 ? querySplit[1] : null);

    if (queryString) {
      queryString.split('&').forEach((param) => {
        const [key, value] = param.split('=');
        if (key && value) {
          params[key] = decodeURIComponent(value);
        }
      });
    }

    return params;
  };

  /**
   * 딥링크 핸들러
   */
  const handleDeepLink = async (event: { url: string }) => {
    if (!event.url) return;

    try {
      console.log('[DeepLink] 수신:', event.url);

      if (enableDebugAlerts) {
        Alert.alert('🔗 딥링크 수신', event.url);
      }

      const params = extractParamsFromUrl(event.url);

      // 에러 체크
      if (params.error || event.url.includes('error=')) {
        const errorMsg = params.error_description || params.error || '알 수 없는 오류';
        console.error('[DeepLink] OAuth 에러:', errorMsg);
        
        if (enableDebugAlerts) {
          Alert.alert('❌ OAuth 에러', errorMsg);
        }
        
        onAuthError?.(errorMsg);
        return;
      }

      // 토큰 확인
      if (params.access_token && params.refresh_token) {
        console.log('[DeepLink] 토큰 발견, 세션 설정 중...');

        if (enableDebugAlerts) {
          Alert.alert('🔑 토큰 발견', '세션을 설정합니다...');
        }

        // Supabase 세션 설정
        const { data, error } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });

        if (error) {
          console.error('[DeepLink] 세션 설정 실패:', error);
          
          if (enableDebugAlerts) {
            Alert.alert('🔥 세션 설정 실패', error.message);
          }
          
          onAuthError?.(error.message);
          return;
        }

        if (data.session) {
          console.log('[DeepLink] 로그인 성공!');
          
          if (enableDebugAlerts) {
            Alert.alert('✅ 로그인 성공', '유저 정보를 불러옵니다.');
          }
          
          onAuthSuccess?.();
        }
      } else {
        // 토큰 없이 돌아온 경우
        console.warn('[DeepLink] access_token 없음:', event.url);
        
        if (enableDebugAlerts) {
          Alert.alert('⚠️ 토큰 없음', 'URL에 토큰이 포함되지 않았습니다.');
        }
      }

    } catch (e: any) {
      console.error('[DeepLink] 처리 중 오류:', e);
      
      if (enableDebugAlerts) {
        Alert.alert('💥 딥링크 처리 오류', e.message || JSON.stringify(e));
      }
      
      onAuthError?.(e.message);
    }
  };

  /**
   * 리스너 등록 (useEffect)
   */
  useEffect(() => {
    // URL 이벤트 리스너
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // 초기 실행 시 URL 확인 (앱이 링크로 실행된 경우)
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('[DeepLink] 초기 URL:', url);
        
        if (enableDebugAlerts) {
          Alert.alert('🚀 초기 실행 URL', url);
        }
        
        handleDeepLink({ url });
      }
    });

    // 클린업
    return () => {
      subscription.remove();
    };
  }, [onAuthSuccess, onAuthError, enableDebugAlerts]);

  return {
    // 필요시 수동 호출용
    handleDeepLink,
  };
};
