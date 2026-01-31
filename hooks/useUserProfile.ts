/**
 * useUserProfile.ts (수정버전)
 * * 문제 해결: .single() 대신 .limit(1).maybeSingle()을 사용하여
 * 중복 데이터 에러("Cannot coerce...")를 강제로 무시하고 진행합니다.
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

      // console.log("🔍 [Profile] 조회 시작 ID:", session.user.id);

      // 2. DB에서 프로필 조회 (🔥 핵심 수정 부분)
      const { data: dbUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .limit(1)       // 🔥 [수정 1] 무조건 1개만 가져오라고 강제함
        .maybeSingle(); // 🔥 [수정 2] 에러를 뱉지 않고 없으면 null, 있으면 객체 반환

      if (error) {
        // 진짜 DB 에러인 경우만 로그 출력
        console.warn('[Profile] DB 조회 에러:', error.message);
      }

      // 데이터가 없거나 에러가 났을 때 -> 로컬 스토리지 폴백
      if (!dbUser) {
        console.warn('[Profile] DB 데이터 없음, 로컬 스토리지 폴백 시도');
        
        const localUser = await loadUserFromStorage();
        if (localUser && localUser.id === session.user.id) {
          setUserInfo(localUser);
          return localUser;
        }
        
        return null; // DB에도 없고 로컬에도 없으면 null
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
        user_id: dbUser.id,
        
        // 🔥 [추가] 중요 데이터 누락 방지
        last_seen_at: dbUser.last_seen_at,
        settings: dbUser.settings,
      };

      // 5. 로컬 스토리지 저장
      await saveUserToStorage(user);
      setUserInfo(user);

      // 6. 푸시 토큰 등록
      await registerPushToken(user);

      // console.log('[Profile] 프로필 로드 완료:', user.name);
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

      if (newToken !== user.push_token) {
        console.log('[Profile] 푸시 토큰 업데이트:', newToken);
        
        const { error } = await supabase
          .from('users')
          .update({ push_token: newToken })
          .eq('id', user.id);

        if (!error) {
          await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, newToken);
        } else {
            // 조용히 실패
        }
      }
    } catch (error) {
        // 조용히 실패
    }
  };

  /**
   * 소셜 유저 추가 정보 업데이트 (전화번호 등)
   * 🔥 수정: update -> upsert로 변경하여 삭제된 유저 데이터 자동 복구
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

      // 1. 현재 로그인된 이메일 가져오기 (데이터 복구 시 필요)
      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = session?.user?.email || '';

      // 2. Upsert 실행 (없으면 생성, 있으면 수정)
      const { error } = await supabase
        .from('users')
        .upsert({
          id: userId,           // 필수: 이 ID로 찾음
          phone: cleanPhone,
          name: name,
          email: userEmail,     // 필수: 혹시 새로 만들 때 필요
          role: 'member',       // 필수: 기본 역할
          updated_at: new Date().toISOString(),
        })
        .select(); // 업데이트 후 결과 반환 보장

      if (error) {
        // 전화번호 중복 체크
        if (error.code === '23505') {
          throw new Error('이미 가입된 전화번호입니다.\n(기존 계정이 존재합니다)');
        }
        throw error;
      }

      // 3. 프로필 재로드 (이제 데이터가 생겼으니 100% 읽힘)
      await loadUserProfile();
      
      console.log('[Profile] 유저 정보 저장(복구) 완료 ✨');
      return true;

    } catch (e: any) {
      console.error('[Profile] 저장 실패:', e);
      Alert.alert('저장 실패', e.message || '오류가 발생했습니다.');
      return false;
    } finally {
      setIsProfileLoading(false);
    }
  };

  // ... (나머지 togglePremium, deleteAccount 등은 기존과 동일)
  const togglePremium = async (): Promise<void> => {
    if (!userInfo) return;
    try {
      const newStatus = !userInfo.is_premium;
      await supabase.from('users').update({ is_premium: newStatus }).eq('id', userInfo.id);
      await savePremiumStatus(newStatus);
      setUserInfo({ ...userInfo, is_premium: newStatus });
    } catch (e) {
      console.error(e);
    }
  };

  const deleteAccount = async (): Promise<boolean> => {
    try {
      setIsProfileLoading(true);
      const { error } = await supabase.rpc('delete_user_account');
      if (error) throw error;
      await clearAllStorage();
      setUserInfo(null);
      return true;
    } catch (e: any) {
      Alert.alert('탈퇴 실패', e.message);
      return false;
    } finally {
      setIsProfileLoading(false);
    }
  };

  const clearProfile = async (): Promise<void> => {
    await clearAllStorage();
    setUserInfo(null);
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