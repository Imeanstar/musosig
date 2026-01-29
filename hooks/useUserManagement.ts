/**
 * useUserManagement.ts (Refactored)
 * 
 * 통합 사용자 관리 Hook - Facade Pattern
 * - 인증 (useAuth)
 * - 딥링크 (useDeepLink)
 * - 프로필 (useUserProfile)
 * 
 * 기존 코드와의 하위 호환성을 유지하면서
 * 내부적으로는 책임을 분리한 Hook들을 조합
 * 
 * @pattern Facade
 * @backward-compatible 기존 컴포넌트에서 수정 없이 사용 가능
 */

import { useState, useEffect } from 'react';
import { UserInfo } from '../types';
import { useAuth } from './useAuth';
import { useDeepLink } from './useDeepLink';
import { useUserProfile } from './useUserProfile';

export const useUserManagement = () => {
  // 📦 분리된 Hook들을 조합
  const auth = useAuth();
  const profile = useUserProfile();
  
  // 통합 로딩 상태 (호환성 유지)
  const [isLoading, setIsLoading] = useState(true);

  // 딥링크 처리 (OAuth 콜백용)
  useDeepLink({
    onAuthSuccess: async () => {
      await profile.loadUserProfile();
    },
    onAuthError: (error) => {
      console.error('[UserManagement] OAuth 에러:', error);
    },
    enableDebugAlerts: __DEV__, // 개발 모드에서만 Alert 활성화
  });

  // 초기 로드
  useEffect(() => {
    const initLoad = async () => {
      setIsLoading(true);
      await profile.loadUserProfile();
      setIsLoading(false);
    };
    initLoad();
  }, []);

  // 로딩 상태 동기화
  useEffect(() => {
    setIsLoading(auth.isAuthLoading || profile.isProfileLoading);
  }, [auth.isAuthLoading, profile.isProfileLoading]);

  /**
   * 🔄 하위 호환성을 위한 Wrapper 함수들
   */

  const loadUser = async (): Promise<UserInfo | null> => {
    return await profile.loadUserProfile();
  };

  const loginWithEmail = async (email: string, password: string): Promise<boolean> => {
    const success = await auth.loginWithEmail(email, password);
    if (success) {
      await profile.loadUserProfile();
    }
    return success;
  };

  const signUpWithEmail = async (
    email: string, 
    password: string, 
    name: string, 
    phone: string
  ): Promise<boolean> => {
    const success = await auth.signUpWithEmail(email, password, name, phone);
    if (success) {
      await profile.loadUserProfile();
    }
    return success;
  };

  const performOAuth = async (provider: 'google' | 'kakao'): Promise<boolean> => {
    // OAuth는 딥링크에서 처리되므로 브라우저만 열어줌
    return await auth.performOAuth(provider);
  };

  const resetAllData = async (): Promise<void> => {
    await auth.logout();
    await profile.clearProfile();
  };

  const updateSocialUserInfo = async (
    userId: string,
    phone: string, 
    name: string
  ): Promise<boolean> => {
    return await profile.updateSocialUserInfo(userId, phone, name);
  };

  /**
   * 📤 통합 인터페이스 반환 (기존 코드와 100% 호환)
   */
  return {
    // 상태
    userInfo: profile.userInfo,
    setUserInfo: profile.setUserInfo,
    isLoading,
    setIsLoading,

    // 프로필
    loadUser,
    
    // 인증
    loginWithEmail,
    signUpWithEmail,
    performOAuth,
    
    // 관리
    togglePremium: profile.togglePremium,
    resetAllData,
    updateSocialUserInfo,
    deleteAccount: profile.deleteAccount,
  };
};