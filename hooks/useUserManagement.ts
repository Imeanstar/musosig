// hooks/useUserManagement.ts - 사용자 관리 커스텀 훅
import { useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { UserInfo } from '../types';
import { saveUserToStorage, loadUserFromStorage, clearAllStorage, savePremiumStatus } from '../utils/storage';
import { MESSAGES } from '../constants';

export const useUserManagement = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * 로컬 스토리지에서 사용자 정보 불러오기
   */
  const loadUser = async (): Promise<UserInfo | null> => {
    try {
      const user = await loadUserFromStorage();
      if (user) {
        setUserInfo(user);
      }
      return user;
    } catch (error) {
      console.error('사용자 정보 불러오기 실패:', error);
      return null;
    }
  };

  /**
   * 회원가입 또는 로그인 처리
   */
  const registerOrLogin = async (name: string, phone: string): Promise<boolean> => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('입력 오류', MESSAGES.REGISTER_ERROR_EMPTY);
      return false;
    }

    setIsLoading(true);

    try {
      // 전화번호로 기존 사용자 조회
      const { data: existingUsers, error: selectError } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phone.trim())
        .limit(1);

      if (selectError) throw selectError;

      let userData;
      let isNewUser = false;

      if (existingUsers && existingUsers.length > 0) {
        // 기존 사용자 - 로그인
        const existingUser = existingUsers[0];
        if (existingUser.name !== name.trim()) {
          // 이름이 다르면 업데이트
          const { data: updatedUser } = await supabase
            .from('users')
            .update({ name: name.trim() })
            .eq('id', existingUser.id)
            .select()
            .single();
          userData = updatedUser || existingUser;
        } else {
          userData = existingUser;
        }
      } else {
        // 신규 사용자 - 회원가입
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

      const userToSave: UserInfo = {
        user_id: userData.id,
        name: userData.name,
        phone: userData.phone,
        emergency_contacts: userData.emergency_contacts || [],
        is_premium: userData.is_premium || false,
      };

      await saveUserToStorage(userToSave);
      setUserInfo(userToSave);

      const message = isNewUser ? MESSAGES.REGISTER_SUCCESS_NEW : MESSAGES.REGISTER_SUCCESS_EXISTING;
      Alert.alert(message, `${userData.name}님, 시작합니다.`);

      return true;
    } catch (error) {
      console.error('등록 에러:', error);
      Alert.alert('오류', MESSAGES.REGISTER_ERROR_FAILED);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Premium 상태 토글
   */
  const togglePremium = async (): Promise<void> => {
    if (!userInfo) return;

    try {
      const newStatus = !userInfo.is_premium;

      const { error } = await supabase
        .from('users')
        .update({ is_premium: newStatus })
        .eq('id', userInfo.user_id);

      if (error) throw error;

      await savePremiumStatus(newStatus);
      setUserInfo({ ...userInfo, is_premium: newStatus });

      Alert.alert(
        '변경 완료',
        newStatus ? MESSAGES.PREMIUM_ENABLED : MESSAGES.PREMIUM_DISABLED
      );
    } catch (error) {
      Alert.alert('오류', MESSAGES.PREMIUM_ERROR);
    }
  };

  /**
   * 모든 데이터 초기화
   */
  const resetAllData = async (): Promise<void> => {
    try {
      await clearAllStorage();
      setUserInfo(null);
    } catch (error) {
      console.error('데이터 초기화 실패:', error);
      throw error;
    }
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
