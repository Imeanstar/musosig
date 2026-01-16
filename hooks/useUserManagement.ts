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
   * 사용자 정보 불러오기 (스토리지 + DB 동기화)
   */
  const loadUser = async (): Promise<UserInfo | null> => {
    try {
      setIsLoading(true);
      
      // 1. 일단 로컬 스토리지에서 빠르게 로드
      let user = await loadUserFromStorage();
      
      // 2. 로그인된 상태라면, DB에서 최신 정보(last_seen_at 등)를 갱신
      if (user) {
        const { data: dbUser, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.user_id)
          .single();

        if (!error && dbUser) {
          // DB 정보와 로컬 정보를 합침 (DB가 우선)
          user = {
            ...user,
            name: dbUser.name,
            phone: dbUser.phone,
            emergency_contacts: dbUser.emergency_contacts,
            is_premium: dbUser.is_premium,
            // last_seen_at 같은 필드가 UserInfo 타입에 없다면 types.ts 추가 필요
          };
          
          // 최신 정보로 스토리지 업데이트
          await saveUserToStorage(user);
        }
        
        setUserInfo(user);
        // 푸시 토큰 확인
        await registerPushToken(user);
      }
      
      return user;
    } catch (error) {
      console.error('사용자 정보 불러오기 실패:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 푸시 토큰 등록 로직 (기존 유지)
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
          .eq('id', user.user_id);

        if (!error) {
          await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, newToken);
          // 상태 업데이트 (화면 리렌더링 없이 조용히 처리)
          setUserInfo(prev => prev ? { ...prev, push_token: newToken } : null);
        }
      }
    } catch (error) {
      console.error('토큰 등록 오류:', error);
    }
  };

  /**
   * 회원가입/로그인 (기존 유지하되, 리턴값 최적화)
   */
  const registerOrLogin = async (name: string, phone: string): Promise<boolean> => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('입력 오류', '이름과 전화번호를 입력해주세요.');
      return false;
    }

    setIsLoading(true);

    try {
      // 전화번호로 조회
      const { data: existingUsers, error: selectError } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phone.trim())
        .maybeSingle(); // limit(1) 대신 maybeSingle 사용 권장

      if (selectError) throw selectError;

      let userData;
      let isNewUser = false;

      if (existingUsers) {
        // 기존 유저 -> 로그인
        userData = existingUsers;
        // 이름이 바뀌었으면 업데이트
        if (userData.name !== name.trim()) {
          await supabase.from('users').update({ name: name.trim() }).eq('id', userData.id);
          userData.name = name.trim();
        }
      } else {
        // 신규 유저 -> 회원가입
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            name: name.trim(),
            phone: phone.trim(),
            emergency_contacts: [],
          })
          .select()
          .single();

        if (insertError) throw insertError;
        userData = newUser;
        isNewUser = true;
      }

      // 앱 내에서 사용할 형태로 변환
      const userToSave: UserInfo = {
        user_id: userData.id,
        name: userData.name,
        phone: userData.phone,
        emergency_contacts: userData.emergency_contacts || [],
        is_premium: userData.is_premium || false,
        push_token: userData.push_token || null,
      };

      await saveUserToStorage(userToSave);
      setUserInfo(userToSave);
      await registerPushToken(userToSave);

      Alert.alert(
        isNewUser ? '환영합니다!' : '반갑습니다!', 
        `${userData.name}님, 오늘도 안녕하신가요?`
      );

      return true;
    } catch (error) {
      console.error('등록 에러:', error);
      Alert.alert('오류', '로그인/회원가입에 실패했습니다.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // ... (togglePremium, resetAllData는 기존 코드와 동일하여 생략 가능하지만, 필요시 그대로 유지)
  const togglePremium = async (): Promise<void> => {
    if (!userInfo) return;
    try {
      const newStatus = !userInfo.is_premium;
      const { error } = await supabase
        .from('users')
        .update({ is_premium: newStatus })
        .eq('id', userInfo.user_id); // id 컬럼 주의

      if (error) throw error;
      await savePremiumStatus(newStatus);
      setUserInfo({ ...userInfo, is_premium: newStatus });
      Alert.alert('변경 완료', newStatus ? '프리미엄 모드 활성화' : '무료 모드로 전환');
    } catch (e) { Alert.alert('오류', '상태 변경 실패'); }
  };

  const resetAllData = async (): Promise<void> => {
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