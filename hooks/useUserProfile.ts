/**
 * useUserProfile.ts
 * 
 * 사용자 프로필 CRUD 전담 Hook
 * - 프로필 로드
 * - 프로필 업데이트
 * - 계정 삭제
 * - 푸시 토큰 등록
 * 
 * @responsibility User Profile Management
 */

import { useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { UserInfo } from '../types';
import { 
  saveUserToStorage, 
  loadUserFromStorage, 
  clearAllStorage,
  savePremiumStatus 
} from '../utils/storage';
import { STORAGE_KEYS } from '../constants';
import { registerForPushNotificationsAsync } from '../utils/notificationHelper';

interface UseUserProfileReturn {
  userInfo: UserInfo | null;
  setUserInfo: (user: UserInfo | null) => void;
  isProfileLoading: boolean;
  loadUserProfile: () => Promise<UserInfo | null>;
  updateSocialUserInfo: (userId: string, phone: string, name: string) => Promise<boolean>;
  togglePremium: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
  clearProfile: () => Promise<void>;
}

export const useUserProfile = (): UseUserProfileReturn => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  /**
   * 사용자 프로필 로드 (DB + 로컬 스토리지)
   */
  const loadUserProfile = async (): Promise<UserInfo | null> => {
    try {
      setIsProfileLoading(true);

      // 1. 세션 확인
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.log('[Profile] 세션 없음, 프로필 클리어');
        await clearAllStorage();
        setUserInfo(null);
        return null;
      }

      // 2. DB에서 프로필 조회
      const { data: dbUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error || !dbUser) {
        console.warn('[Profile] DB 조회 실패, 로컬 스토리지 폴백:', error?.message);
        
        // 3. 폴백: 로컬 스토리지에서 로드
        const localUser = await loadUserFromStorage();
        if (localUser && localUser.id === session.user.id) {
          setUserInfo(localUser);
          return localUser;
        }
        
        return null;
      }

      // 4. UserInfo 객체 생성
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
        user_id: dbUser.id, // 하위 호환성
      };

      // 5. 로컬 스토리지 저장
      await saveUserToStorage(user);
      setUserInfo(user);

      // 6. 푸시 토큰 등록
      await registerPushToken(user);

      console.log('[Profile] 프로필 로드 완료:', user.name);
      return user;

    } catch (error) {
      console.error('[Profile] 로드 실패:', error);
      setUserInfo(null);
      return null;
    } finally {
      setIsProfileLoading(false);
    }
  };

  /**
   * 푸시 토큰 등록/업데이트
   */
  const registerPushToken = async (user: UserInfo): Promise<void> => {
    try {
      const newToken = await registerForPushNotificationsAsync();
      if (!newToken) return;

      // 토큰이 변경된 경우에만 업데이트
      if (newToken !== user.push_token) {
        console.log('[Profile] 푸시 토큰 업데이트:', newToken);
        
        const { error } = await supabase
          .from('users')
          .update({ push_token: newToken })
          .eq('id', user.id);

        if (!error) {
          await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, newToken);
        } else {
          console.error('[Profile] 푸시 토큰 저장 실패:', error);
        }
      }
    } catch (error) {
      console.error('[Profile] 푸시 토큰 등록 오류:', error);
    }
  };

  /**
   * 소셜 유저 추가 정보 업데이트 (전화번호 등)
   */
  const updateSocialUserInfo = async (
    userId: string, 
    phone: string, 
    name: string
  ): Promise<boolean> => {
    if (!userId) return false;

    try {
      setIsProfileLoading(true);
      const cleanPhone = phone.replace(/-/g, '');

      const { error } = await supabase
        .from('users')
        .update({
          phone: cleanPhone,
          name,
          updated_at: new Date(),
        })
        .eq('id', userId);

      if (error) {
        // 중복 전화번호 체크
        if (error.code === '23505') {
          throw new Error('이미 가입된 전화번호입니다.\n기존 계정으로 로그인해주세요.');
        }
        throw error;
      }

      // 프로필 재로드
      await loadUserProfile();
      console.log('[Profile] 소셜 유저 정보 업데이트 완료');
      return true;

    } catch (e: any) {
      console.error('[Profile] 소셜 유저 정보 업데이트 실패:', e);
      Alert.alert('저장 실패', e.message || '오류가 발생했습니다.');
      return false;
    } finally {
      setIsProfileLoading(false);
    }
  };

  /**
   * 프리미엄 상태 토글 (개발/테스트용)
   */
  const togglePremium = async (): Promise<void> => {
    if (!userInfo) return;

    try {
      const newStatus = !userInfo.is_premium;
      
      await supabase
        .from('users')
        .update({ is_premium: newStatus })
        .eq('id', userInfo.id);

      await savePremiumStatus(newStatus);
      setUserInfo({ ...userInfo, is_premium: newStatus });

      console.log('[Profile] 프리미엄 상태 변경:', newStatus);
    } catch (e) {
      console.error('[Profile] 프리미엄 상태 변경 실패:', e);
      Alert.alert('오류', '상태 변경 실패');
    }
  };

  /**
   * 계정 삭제
   */
  const deleteAccount = async (): Promise<boolean> => {
    try {
      setIsProfileLoading(true);

      // Supabase RPC 호출 (계정 삭제)
      const { error } = await supabase.rpc('delete_user_account');
      if (error) throw error;

      // 로컬 데이터 청소
      await clearAllStorage();
      setUserInfo(null);

      console.log('[Profile] 계정 삭제 완료');
      return true;

    } catch (e: any) {
      console.error('[Profile] 계정 삭제 실패:', e);
      Alert.alert('탈퇴 실패', '잠시 후 다시 시도해주세요.\n' + e.message);
      return false;
    } finally {
      setIsProfileLoading(false);
    }
  };

  /**
   * 프로필 클리어 (로그아웃 시 사용)
   */
  const clearProfile = async (): Promise<void> => {
    await clearAllStorage();
    setUserInfo(null);
    console.log('[Profile] 프로필 클리어 완료');
  };

  return {
    userInfo,
    setUserInfo,
    isProfileLoading,
    loadUserProfile,
    updateSocialUserInfo,
    togglePremium,
    deleteAccount,
    clearProfile,
  };
};
