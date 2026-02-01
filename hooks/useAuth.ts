/**
 * useAuth.ts
 * * 인증 관련 로직 담당 Hook
 * * [수정 완료] 디버깅 모드 종료 -> 실전 인증 모드 전환
 */

import { useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import * as WebBrowser from 'expo-web-browser';

// 브라우저 세션 완료 처리 (Web 환경 대응)
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

  // 이메일 로그인 (기존 유지)
  const loginWithEmail = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsAuthLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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

  // 이메일 회원가입 (기존 유지)
  const signUpWithEmail = async (
    email: string, 
    password: string, 
    name: string, 
    phone: string
  ): Promise<boolean> => {
    try {
      setIsAuthLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name, phone } }
      });

      if (error) throw error;
      if (!data.user) throw new Error('회원가입 실패');

      const { error: dbError } = await supabase.from('users').upsert({
        id: data.user.id,
        name,
        phone,
        role: 'manager', 
        updated_at: new Date()
      });

      if (dbError) {
        if (dbError.code === '23505') throw new Error('이미 가입된 전화번호입니다.\n로그인해주세요.');
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
   * OAuth 소셜 로그인 (최종 수정됨)
   */
  const performOAuth = async (provider: 'google' | 'kakao'): Promise<boolean> => {
    try {
      setIsAuthLoading(true);
      
      // ✅ [중요] 앱 설정과 정확히 일치하는 리다이렉트 주소
      const redirectUrl = 'musosik://auth/callback';
      
      console.log(`[Auth] ${provider} 로그인 시작...`);

      // 1. Supabase에서 인증 URL 받기
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true, // 딥링크 사용 시 필수
        },
      });

      if (error) throw error;
      if (!data.url) {
        Alert.alert("오류", "인증 URL을 받아오지 못했습니다.");
        return false;
      }

      // 2. 브라우저 세션 열기 (여기가 핵심!)
      // - openBrowserAsync (X) -> openAuthSessionAsync (O) 로 복구
      // - 결과를 기다렸다가 처리합니다.
      try { await WebBrowser.warmUpAsync(); } catch (e) {}
      
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );

      try { await WebBrowser.coolDownAsync(); } catch (e) {}

      // 3. 결과 처리
      if (result.type === 'success') {
        // 성공적으로 주소를 달고 돌아왔을 때
        console.log('[Auth] 성공 URL 감지:', result.url);
        // 여기서 굳이 세션을 수동으로 setSession 할 필요는 없습니다.
        // Supabase가 딥링크를 감지하여 자동으로 세션을 맺어줍니다.
        return true;
      } 
      
      // 안드로이드 특성상:
      // 앱이 딥링크로 열리면 브라우저 입장에서는 'dismiss'가 될 수도 있습니다.
      // 따라서 여기서 false를 리턴해도, 실제로는 앱이 켜지면서 로그인이 될 수 있습니다.
      console.log('[Auth] 브라우저 종료됨 (Type):', result.type);
      
      // 사용자 경험을 위해 false를 반환하지만, 
      // 실제 앱 진입 처리는 _layout.tsx의 URL Event Listener가 담당합니다.
      return false;

    } catch (e: any) {
      console.error('[Auth] OAuth 에러:', e);
      Alert.alert('오류', '로그인 중 문제가 발생했습니다.');
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsAuthLoading(true);
      await supabase.auth.signOut();
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