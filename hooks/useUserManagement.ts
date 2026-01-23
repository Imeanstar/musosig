// hooks/useUserManagement.ts (최종 완전체)
import { useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { UserInfo } from '../types';
import { saveUserToStorage, loadUserFromStorage, clearAllStorage, savePremiumStatus } from '../utils/storage';
import { MESSAGES, STORAGE_KEYS } from '../constants';
import { registerForPushNotificationsAsync } from '../utils/notificationHelper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession(); // 웹 브라우저 닫기 처리

export const useUserManagement = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 사용자 정보 불러오기
  const loadUser = async (): Promise<UserInfo | null> => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        await clearAllStorage();
        setUserInfo(null);
        setIsLoading(false);
        return null;
      }

      const { data: dbUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error || !dbUser) {
        const localUser = await loadUserFromStorage();
        if (localUser && localUser.id === session.user.id) {
           setUserInfo(localUser);
           return localUser;
        }
        return null;
      }

      const user: UserInfo = {
        id: dbUser.id,
        role: dbUser.role,
        name: dbUser.name,
        phone: dbUser.phone,
        pairing_code: dbUser.pairing_code,
        manager_id: dbUser.manager_id,
        nickname: dbUser.nickname,
        relation_tag: dbUser.relation_tag,
        emergency_contacts: dbUser.emergency_contacts || [],
        is_premium: dbUser.is_premium || false,
        is_admin: dbUser.is_admin,
        push_token: dbUser.push_token,
        user_id: dbUser.id 
      };

      await saveUserToStorage(user);
      setUserInfo(user);
      registerPushToken(user);

      return user;
    } catch (error) {
      console.error('사용자 정보 불러오기 실패:', error);
      setUserInfo(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const registerPushToken = async (user: UserInfo): Promise<void> => {
    try {
      const newToken = await registerForPushNotificationsAsync();
      if (!newToken) return;
      if (newToken !== user.push_token) {
        const { error } = await supabase.from('users').update({ push_token: newToken }).eq('id', user.id);
        if (!error) await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, newToken);
      }
    } catch (error) { console.error('토큰 등록 오류:', error); }
  };

  /**
   * 🔐 이메일 로그인
   */
  const loginWithEmail = async (email: string, pw: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pw,
      });

      if (error) throw error;
      if (!data.session) throw new Error('세션 없음');

      await loadUser();
      return true;
    } catch (e: any) {
      Alert.alert('로그인 실패', '아이디와 비밀번호를 확인해주세요.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 📝 이메일 회원가입
   */
  const signUpWithEmail = async (email: string, pw: string, name: string, phone: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pw,
        options: {
          data: { full_name: name, phone: phone } // SQL 트리거가 이 정보를 사용함
        }
      });

      if (error) throw error;
      if (!data.user) throw new Error('회원가입 실패');

      // 트리거가 실패할 경우를 대비한 수동 저장
      const { error: dbError } = await supabase.from('users').upsert({
          id: data.user.id,
          name: name,
          phone: phone,
          role: 'manager',
          updated_at: new Date()
        });
      
      if (dbError) console.warn("DB 수동 저장 실패(트리거가 이미 처리했을 수 있음):", dbError);

      await loadUser();
      Alert.alert('환영합니다!', `${name} 매니저님 가입을 축하드립니다.`);
      return true;
    } catch (e: any) {
      console.error(e);
      Alert.alert('가입 실패', e.message || '오류가 발생했습니다.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * URL에서 토큰 정보를 추출하는 헬퍼 함수
   */
  const extractParamsFromUrl = (url: string) => {
    const params: { [key: string]: string } = {};
    // Supabase는 모바일 딥링크 리다이렉트 시 '#' 뒤에 토큰을 붙여서 보냅니다.
    const queryString = url.split('#')[1]; 
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
   * 🌟 소셜 로그인 (Google, Kakao) - "이중 체크" 적용 버전
   */
  const performOAuth = async (provider: 'google' | 'kakao') => {
    try {
      setIsLoading(true);
      
      // 1. Expo Go용 Redirect URL 생성
      // exp://192.168.x.x:8081/--/auth/callback 형태가 됩니다.
      const redirectUrl = makeRedirectUri({
        path: 'auth/callback',
      });
      
      console.log(`[OAuth] 시작 - Redirect URL: ${redirectUrl}`);

      // 2. OAuth 프로세스 시작 (브라우저 열기 전 URL 획득)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true, 
        },
      });

      if (error) throw error;
      
      if (data.url) {
        // 3. 브라우저 열기
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl 
        );

        // --------------------------------------------------------
        // 🕵️ 전략 1: 브라우저가 토큰을 물고 정상적으로 돌아온 경우
        // --------------------------------------------------------
        if (result.type === 'success' && result.url) {
           console.log("[OAuth] 브라우저 리다이렉트 성공, 토큰 파싱 시도");
           const params = extractParamsFromUrl(result.url);
           
           if (params.access_token && params.refresh_token) {
             const { data: { session }, error: sessionError } = await supabase.auth.setSession({
               access_token: params.access_token,
               refresh_token: params.refresh_token,
             });

             if (sessionError) throw sessionError;
             if (session) {
               await loadUser();
               return true;
             }
           }
        }

        // --------------------------------------------------------
        // 🕵️ 전략 2: (핵심 해결책) 브라우저는 닫혔는데 결과가 애매할 때
        // (안드로이드/Expo Go에서 딥링크가 앱을 깨우면서 result가 dismiss로 뜰 때가 있음)
        // --------------------------------------------------------
        console.log("[OAuth] 브라우저 종료됨. 혹시 세션이 맺어졌는지 2차 확인...");
        
        // 아주 잠깐 대기 후 세션 확인 (비동기 처리 시간 확보)
        await new Promise(resolve => setTimeout(resolve, 500)); 

        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log("[OAuth] 2차 확인 성공! 세션이 존재합니다.");
          await loadUser();
          return true;
        }
      }
      
      console.log("[OAuth] 최종 실패: 세션을 찾을 수 없습니다.");
      return false;

    } catch (e) { 
      console.error('소셜 로그인 실패:', e);
      // 에러가 나도 한 번 더 체크 (사용자 경험 보호)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
          await loadUser();
          return true;
      }
      
      Alert.alert("로그인 실패", "카카오 로그인 중 오류가 발생했습니다.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const togglePremium = async (): Promise<void> => {
    if (!userInfo) return;
    try {
      const newStatus = !userInfo.is_premium;
      await supabase.from('users').update({ is_premium: newStatus }).eq('id', userInfo.id);
      await savePremiumStatus(newStatus);
      setUserInfo({ ...userInfo, is_premium: newStatus });
    } catch (e) { Alert.alert('오류', '상태 변경 실패'); }
  };

  const resetAllData = async (): Promise<void> => {
    await supabase.auth.signOut();
    await clearAllStorage();
    setUserInfo(null);
  };

  return {
    userInfo, setUserInfo, isLoading, setIsLoading, loadUser,
    loginWithEmail, signUpWithEmail, // 👈 신규 로직
    performOAuth, togglePremium, resetAllData,
  };
};