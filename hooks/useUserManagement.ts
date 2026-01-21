// hooks/useUserManagement.ts
import { useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { UserInfo } from '../types';
import { saveUserToStorage, loadUserFromStorage, clearAllStorage, savePremiumStatus } from '../utils/storage';
import { MESSAGES, STORAGE_KEYS } from '../constants';
import { registerForPushNotificationsAsync } from '../utils/notificationHelper';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useUserManagement = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * 사용자 정보 불러오기 (세션 우선 확인 -> DB 조회 -> 스토리지 저장)
   */
  const loadUser = async (): Promise<UserInfo | null> => {
    try {
      setIsLoading(true);

      // 1. 🔍 [핵심 수정] Supabase 실제 세션부터 확인
      const { data: { session } } = await supabase.auth.getSession();

      // 세션이 없으면 -> 로그아웃 상태로 간주
      if (!session) {
        await clearAllStorage();
        setUserInfo(null);
        setIsLoading(false);
        return null;
      }

      // 2. 세션이 있다면 -> DB에서 최신 정보 가져오기
      const { data: dbUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error || !dbUser) {
        console.warn("세션은 있으나 DB 정보 조회 실패 (네트워크 오류 등)");
        // DB 조회 실패 시, 비상용으로 로컬 스토리지 시도
        const localUser = await loadUserFromStorage();
        if (localUser && localUser.id === session.user.id) {
            setUserInfo(localUser);
            return localUser;
        }
        return null;
      }

      // 3. DB 정보를 기반으로 UserInfo 객체 생성
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
        // 호환성용
        user_id: dbUser.id 
      };

      // 4. 최신 정보를 로컬 스토리지에 저장 (다음번엔 빠르게 로드됨)
      await saveUserToStorage(user);
      
      // 5. 상태 업데이트
      setUserInfo(user);
      console.log("✅ 유저 정보 로드 성공:", user.name);

      // 푸시 토큰 갱신 (비동기로 조용히 실행)
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

  /**
   * 푸시 토큰 등록 로직
   */
  const registerPushToken = async (user: UserInfo): Promise<void> => {
    try {
      const newToken = await registerForPushNotificationsAsync();
      if (!newToken) return;

      if (newToken !== user.push_token) {
        console.log('🔔 푸시 토큰 DB 업데이트...');
        const { error } = await supabase
          .from('users')
          .update({ push_token: newToken })
          .eq('id', user.id);

        if (!error) {
          await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, newToken);
          // 상태 업데이트는 선택사항 (불필요한 리렌더링 방지 위해 생략 가능)
        }
      }
    } catch (error) {
      console.error('토큰 등록 오류:', error);
    }
  };

  /**
   * 회원가입/로그인 (Manager용 - Member는 MemberPairing에서 직접 처리함)
   */
  const registerOrLogin = async (name: string, phone: string): Promise<boolean> => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('입력 오류', '이름과 전화번호를 입력해주세요.');
      return false;
    }

    setIsLoading(true);

    try {
      const email = `${phone.trim()}@musosik.app`;
      const password = `musosik${phone.trim()}`;

      // 로그인 시도
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      let session = signInData.session;
      let user = signInData.user;

      // 실패 시 가입 시도
      if (signInError) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        session = signUpData.session;
        user = signUpData.user;
      }

      if (!session || !user) throw new Error('세션 생성 실패');

      // DB 저장
      const { data: userData, error: dbError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          name: name.trim(),
          phone: phone.trim(),
          role: 'manager', // 기본적으로 이 함수는 매니저용
          updated_at: new Date()
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // 앱 내 상태 업데이트를 위해 loadUser 호출
      await loadUser();

      return true;

    } catch (error) {
      console.error('인증 처리 에러:', error);
      Alert.alert('오류', '로그인 처리에 실패했습니다.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const togglePremium = async (): Promise<void> => {
    if (!userInfo) return;
    try {
      const newStatus = !userInfo.is_premium;
      const { error } = await supabase
        .from('users')
        .update({ is_premium: newStatus })
        .eq('id', userInfo.id);

      if (error) throw error;
      await savePremiumStatus(newStatus);
      setUserInfo({ ...userInfo, is_premium: newStatus });
      Alert.alert('변경 완료', newStatus ? '프리미엄 모드 활성화' : '무료 모드로 전환');
    } catch (e) { Alert.alert('오류', '상태 변경 실패'); }
  };

  const resetAllData = async (): Promise<void> => {
    await supabase.auth.signOut();
    await clearAllStorage();
    setUserInfo(null);
  };

  return {
    userInfo,
    setUserInfo,
    isLoading,
    setIsLoading,
    loadUser,
    registerOrLogin,
    togglePremium,
    resetAllData,
  };
};