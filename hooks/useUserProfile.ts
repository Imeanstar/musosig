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

      // 2. DB에서 프로필 조회
      const { data: dbUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .limit(1)
        .maybeSingle();

      if (error) {
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
        return null;
      }

      // 🔥 [Step 3. 추가됨] 프리미엄 만료일 체크 로직
      // DB에 is_premium이 true인데, 날짜가 지났으면 -> false로 강제 변경
      if (dbUser.is_premium && dbUser.premium_expiry_at) {
        const now = new Date();
        const expiryDate = new Date(dbUser.premium_expiry_at);

        if (now > expiryDate) {
          console.log('[Profile] 🚫 프리미엄 기간 만료됨! 등급을 내립니다.');
          
          // 1. DB 업데이트 (await로 확실하게 처리)
          await supabase
            .from('users')
            .update({ is_premium: false })
            .eq('id', session.user.id);
            
          // 2. 현재 메모리에 있는 데이터도 즉시 수정 (그래야 아래 Step 4에서 적용됨)
          dbUser.is_premium = false; 
        }
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
        
        last_seen_at: dbUser.last_seen_at,
        settings: dbUser.settings,
        
        // 🔥 [추가] 날짜 정보도 state에 포함시켜야 UI에서 확인 가능
        premium_started_at: dbUser.premium_started_at,
        premium_expiry_at: dbUser.premium_expiry_at,
      };

      // 5. 로컬 스토리지 저장
      await saveUserToStorage(user);
      setUserInfo(user);

      // 6. 푸시 토큰 등록
      await registerPushToken(user);

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

  /**
   * 프리미엄 상태 토글 (개발/테스트용 + 날짜 업데이트 추가)
   */
  const togglePremium = async (): Promise<void> => {
    if (!userInfo) return;

    try {
      const newStatus = !userInfo.is_premium;
      const now = new Date();
      
      // 업데이트할 데이터 객체 만들기
      const updates: any = {
        is_premium: newStatus,
        updated_at: now.toISOString(),
      };

      // 🔥 [핵심] 프리미엄을 '켤 때'만 시작일과 만료일을 갱신합니다.
      if (newStatus === true) {
        updates.premium_started_at = now.toISOString();
        
        // (선택) 만료일을 30일 뒤로 설정하고 싶다면?
        const expiryDate = new Date(now);
        expiryDate.setDate(now.getDate() + 31); // 30일 추가
        updates.premium_expiry_at = expiryDate.toISOString();
      } 
      // 끄는 경우(false)에는 날짜를 NULL로 할지, 기록으로 남길지 선택 (보통 그냥 둠)

      // DB 업데이트
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userInfo.id);

      if (error) throw error;

      // 로컬 상태 즉시 반영
      await savePremiumStatus(newStatus);
      setUserInfo({ 
        ...userInfo, 
        is_premium: newStatus,
        // UI에 바로 반영되게 날짜도 로컬 state에 업데이트
        premium_started_at: newStatus ? now.toISOString() : userInfo.premium_started_at 
      });

      console.log(`[Profile] 프리미엄 ${newStatus ? 'ON' : 'OFF'} (날짜 갱신됨)`);

    } catch (e) {
      console.error('[Profile] 프리미엄 상태 변경 실패:', e);
      Alert.alert('오류', '상태 변경 실패');
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