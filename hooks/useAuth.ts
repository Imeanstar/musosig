/**
 * useAuth.ts
 * * 인증 관련 로직 담당 Hook
 * * [최종 수정] 외부 브라우저(Linking) 강제 사용으로 딥링크 차단 우회
 */

import { useState } from 'react';
import { Alert, Linking } from 'react-native'; // 👈 Linking 추가됨
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

  // 1. 이메일 로그인 (기존 유지)
  // useAuth 훅 내부
  const loginWithEmail = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsAuthLoading(true);

      // ✅ 1. 공백 제거 (가장 중요!)
      // 사용자가 실수로 넣은 앞뒤 공백을 싹둑 자릅니다.
      const cleanEmail = email.trim(); 
      const cleanPassword = password.trim(); // 비밀번호도 공백 제거 추천

      // ✅ 2. 디버깅용 로그 (터미널에서 확인하세요)
      console.log(`[로그인 시도] 이메일: '${cleanEmail}', 비밀번호길이: ${cleanPassword.length}`);

      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: cleanEmail, 
        password: cleanPassword 
      });
      
      if (error) {
        // ✅ 3. 정확한 에러 메시지 확인
        console.error('[Supabase 에러 상세]', error.message); 
        throw error;
      }

      if (!data.session) throw new Error('세션 생성 실패');
      
      return true;
    } catch (e: any) {
      console.error('[Auth] 로그인 실패:', e);
      
      // 사용자에게 더 친절한 에러 메시지
      let message = '아이디와 비밀번호를 확인해주세요.';
      if (e.message.includes('Invalid login credentials')) {
        message = '이메일 또는 비밀번호가 틀렸습니다.';
      } else if (e.message.includes('Email not confirmed')) {
        message = '이메일 인증이 완료되지 않았습니다.';
      }

      Alert.alert('로그인 실패', message);
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  };

  // 2. 이메일 회원가입 (기존 유지)
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
   * 3. OAuth 소셜 로그인 (핵심 수정됨)
   * - WebBrowser 대신 Linking.openURL 사용
   * - 외부 브라우저(Chrome 앱 등)를 강제로 열어 딥링크 차단을 방지함
   */
  const performOAuth = async (provider: 'google' | 'kakao'): Promise<boolean> => {
    try {
      setIsAuthLoading(true);
      
      const redirectUrl = 'musosik://auth/callback';
      // console.log(`[Auth] ${provider} 로그인 시작... Target: ${redirectUrl}`);
      // Alert.alert(`[Auth] ${provider} 로그인 시작... Target: ${redirectUrl}`);
      // A. Supabase 인증 URL 생성
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          // 👇 중요: 자동 리다이렉트가 막힐 경우를 대비해 '클릭 유도 페이지' 표시
          skipBrowserRedirect: true, 
        },
      });

      if (error) throw error;
      if (!data.url) {
        // Alert.alert("오류", "인증 URL을 받아오지 못했습니다.");
        return false;
      }

      // B. 외부 브라우저로 열기 (HTML 테스트와 동일한 환경 조성)
      // Linking.openURL은 앱 내장 브라우저가 아닌 '시스템 기본 브라우저 앱'을 실행합니다.
      // Alert.alert(`data.url : ${data.url}`);
      const canOpen = await Linking.canOpenURL(data.url);
      if (canOpen) {
        await Linking.openURL(data.url);
      } else {
        // 만약 외부 브라우저를 못 여는 상황이라면 fallback으로 기존 방식 사용
        await WebBrowser.openBrowserAsync(data.url);
      }

      // 브라우저가 열리면 이 함수는 종료되고, 이후 처리는 callback.tsx가 담당합니다.
      return true;

    } catch (e: any) {
      console.error('[Auth] OAuth 에러:', e);
      // Alert.alert('오류', '로그인 중 문제가 발생했습니다.');
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  };

  // 4. 로그아웃 (기존 유지)
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