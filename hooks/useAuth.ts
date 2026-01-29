/**
 * useAuth.ts
 * 
 * 인증 관련 로직만 담당하는 Hook
 * - 이메일 로그인/회원가입
 * - OAuth (소셜 로그인)
 * - 로그아웃
 * 
 * @responsibility Authentication
 */

import { useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

interface UseAuthReturn {
  isAuthLoading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<boolean>;
  signUpWithEmail: (email: string, password: string, name: string, phone: string) => Promise<boolean>;
  performOAuth: (provider: 'google' | 'kakao') => Promise<boolean>;
  logout: () => Promise<void>;
}

export const useAuth = (): UseAuthReturn => {
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  /**
   * 이메일 로그인
   */
  const loginWithEmail = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsAuthLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.session) throw new Error('세션 생성 실패');

      return true;
    } catch (e: any) {
      console.error('[Auth] 로그인 실패:', e);
      Alert.alert('로그인 실패', '아이디와 비밀번호를 확인해주세요.');
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  };

  /**
   * 이메일 회원가입
   */
  const signUpWithEmail = async (
    email: string, 
    password: string, 
    name: string, 
    phone: string
  ): Promise<boolean> => {
    try {
      setIsAuthLoading(true);

      // 1. Auth 계정 생성
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name, phone }
        }
      });

      if (error) throw error;
      if (!data.user) throw new Error('회원가입 실패');

      // 2. users 테이블에 프로필 생성
      const { error: dbError } = await supabase.from('users').upsert({
        id: data.user.id,
        name,
        phone,
        role: 'manager', // 기본값: Manager
        updated_at: new Date()
      });

      if (dbError) {
        // 중복 전화번호 체크
        if (dbError.code === '23505') {
          throw new Error('이미 가입된 전화번호입니다.\n로그인해주세요.');
        }
        throw dbError;
      }

      Alert.alert('환영합니다!', `${name} 매니저님 가입을 축하드립니다.`);
      return true;

    } catch (e: any) {
      console.error('[Auth] 회원가입 실패:', e);
      Alert.alert('가입 실패', e.message || '오류가 발생했습니다.');
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  };

  /**
   * OAuth 소셜 로그인
   */
  const performOAuth = async (provider: 'google' | 'kakao'): Promise<boolean> => {
    try {
      setIsAuthLoading(true);

      const redirectUrl = 'musosik://auth/callback';

      console.log('[Auth] OAuth 시작:', { provider, redirectUrl });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        if (result.type === 'success') {
          console.log('[Auth] OAuth 브라우저 성공:', result.url);
          // 실제 세션 처리는 useDeepLink에서 담당
          return true;
        } else if (result.type === 'dismiss') {
          console.log('[Auth] 사용자가 로그인 취소');
          return false;
        } else {
          console.warn('[Auth] OAuth 예상치 못한 결과:', result.type);
          return false;
        }
      }

      return false;

    } catch (e: any) {
      console.error('[Auth] OAuth 에러:', e);
      Alert.alert('OAuth 에러', e.message || '로그인 중 오류가 발생했습니다.');
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  };

  /**
   * 로그아웃
   */
  const logout = async (): Promise<void> => {
    try {
      setIsAuthLoading(true);
      await supabase.auth.signOut();
      console.log('[Auth] 로그아웃 완료');
    } catch (e) {
      console.error('[Auth] 로그아웃 실패:', e);
    } finally {
      setIsAuthLoading(false);
    }
  };

  return {
    isAuthLoading,
    loginWithEmail,
    signUpWithEmail,
    performOAuth,
    logout,
  };
};
