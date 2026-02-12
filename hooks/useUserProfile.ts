/**
 * useUserProfile.ts (최종 수정버전)
 * * 문제 해결 1: .limit(1).maybeSingle()로 중복 데이터 조회 에러 방지
 * * 문제 해결 2: updateSocialUserInfo에서 role을 'manager'로 강제 설정하여 권한 문제 해결
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
import { useUserContext } from '../contexts/UserContext';

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
  const { userInfo, setUserInfo } = useUserContext();
  
  const [isProfileLoading, setIsProfileLoading] = useState(false); // 로딩은 지역 상태여도 됨

  /**
   * 사용자 프로필 로드 (DB + 로컬 스토리지)
   */
  // hooks/useUserProfile.ts 내부

const loadUserProfile = async (): Promise<UserInfo | null> => {
  try {
    setIsProfileLoading(true);

    // 1. 세션 확인
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.log('[Profile] 세션 없음, 프로필 클리어');
      await clearAllStorage(); // 함수가 import 되어 있어야 함
      setUserInfo(null);
      return null;
    }

    // 2. DB에서 내 기본 정보 조회
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
      
      const localUser = await loadUserFromStorage(); // 함수 import 필요
      if (localUser && localUser.id === session.user.id) {
        setUserInfo(localUser);
        return localUser;
      }
      return null;
    }

    // 3. [기존 유지] 프리미엄 만료일 체크 로직 (매니저 본인용)
    // (만약 내가 매니저이고 기간이 지났다면, 여기서 DB를 업데이트해서 false로 만듦)
    if (dbUser.is_premium && dbUser.premium_expiry_at) {
      const now = new Date();
      const expiryDate = new Date(dbUser.premium_expiry_at);

      if (now > expiryDate) {
        console.log('[Profile] 🚫 프리미엄 기간 만료됨! 등급을 내립니다.');
        
        await supabase
          .from('users')
          .update({ is_premium: false })
          .eq('id', session.user.id);
          
        dbUser.is_premium = false; 
      }
    }

    // -----------------------------------------------------------
    // 🌟 [추가됨] 4. 진짜 프리미엄 상태 확인 (RPC 호출)
    // (Member는 RLS 때문에 매니저 정보를 못 읽으므로, 이 함수가 대신 읽어옴)
    // -----------------------------------------------------------
    let finalPremiumStatus = dbUser.is_premium; // 기본값은 내 정보

    // RPC 호출
    const { data: rpcPremium, error: rpcError } = await supabase.rpc('get_my_premium_status');

    console.log("🔍 프리미엄 체크 결과:", rpcPremium);
    console.log("🚨 에러 있나요?:", rpcError);

    if (!rpcError && rpcPremium !== null) {
      // RPC가 성공하면 그 값을 '진짜 상태'로 사용
      finalPremiumStatus = rpcPremium;
    } else {
       console.log("프리미엄 체크 RPC 실패(또는 null), 기존 값 유지:", rpcError?.message);
    }
    // -----------------------------------------------------------


    // 5. UserInfo 객체 생성
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
      points: dbUser.points || 0,
      is_safe_today: dbUser.is_safe_today || false,
      last_proof_url: dbUser.last_proof_url || null,
        
      
      // 🚨 [수정] 여기가 핵심입니다! RPC로 가져온 값을 우선 적용
      is_premium: finalPremiumStatus || false, 
      
      is_admin: dbUser.is_admin,
      push_token: dbUser.push_token,
      user_id: dbUser.id,
      
      last_seen_at: dbUser.last_seen_at,
      settings: dbUser.settings,
      
      premium_started_at: dbUser.premium_started_at,
      premium_expiry_at: dbUser.premium_expiry_at,
    };
    console.log("🔥 최종 적용된 상태:", user.is_premium);
    console.log("✅ 최종 User 객체의 프리미엄 값:", user.is_premium);

    // 6. 로컬 스토리지 저장 및 상태 업데이트
    await saveUserToStorage(user); // 함수 import 필요
    setUserInfo(user);

    // 7. 푸시 토큰 등록
    await registerPushToken(user); // 함수 import 필요

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
        }
      }
    } catch (error) {
      // 조용히 실패
    }
  };

  /**
   * 소셜 유저 추가 정보 업데이트 (전화번호 등)
   * 🔥 [핵심 수정] role: 'manager'로 강제 설정하여 권한 문제 해결
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

      // 1. 현재 로그인된 이메일 가져오기
      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = session?.user?.email || '';

      // ✅ [추가됨] 2. DB에 저장된 내 기존 역할(Role) 확인하기
      // (이미 member로 되어있는데 manager로 덮어쓰는 사고 방지)
      const { data: existingUser } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      // ✅ [핵심 로직]
      // 기존 역할이 있으면 그대로 유지(existingUser.role)
      // 없으면(신규가입) 'manager' 부여
      const finalRole = existingUser?.role ? existingUser.role : 'manager';

      console.log(`[Profile] 역할 저장 예정: ${finalRole} (기존: ${existingUser?.role})`);

      // 3. Upsert 실행
      const { error } = await supabase
        .from('users')
        .upsert({
          id: userId,
          phone: cleanPhone,
          name: name,
          email: userEmail,
          
          // 🚨 [수정됨] 무조건 'manager'가 아니라, 결정된 역할(finalRole)을 넣습니다.
          role: finalRole, 
          
          updated_at: new Date().toISOString(),
        })
        .select();

      if (error) {
        if (error.code === '23505') {
          throw new Error('이미 가입된 전화번호입니다.\n(기존 계정이 존재합니다)');
        }
        throw error;
      }

      // 4. 프로필 재로드
      await loadUserProfile();
      
      console.log('[Profile] 유저 정보 저장 완료 ✨');
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
   * 프리미엄 상태 토글
   */
  const togglePremium = async (): Promise<void> => {
    if (!userInfo) return;

    try {
      const newStatus = !userInfo.is_premium;
      const now = new Date();
      
      const updates: any = {
        is_premium: newStatus,
        updated_at: now.toISOString(),
      };

      if (newStatus === true) {
        updates.premium_started_at = now.toISOString();
        const expiryDate = new Date(now);
        expiryDate.setDate(now.getDate() + 31);
        updates.premium_expiry_at = expiryDate.toISOString();
      } 

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userInfo.id);

      if (error) throw error;

      await savePremiumStatus(newStatus);
      setUserInfo({ 
        ...userInfo, 
        is_premium: newStatus,
        premium_started_at: newStatus ? now.toISOString() : userInfo.premium_started_at 
      });

      console.log(`[Profile] 프리미엄 ${newStatus ? 'ON' : 'OFF'}`);

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