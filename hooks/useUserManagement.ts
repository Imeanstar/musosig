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
   * 사용자 정보 불러오기 (스토리지 + DB 동기화 + 세션 검증)
   */
  const loadUser = async (): Promise<UserInfo | null> => {
    try {
      setIsLoading(true);
      
      // 1. 일단 로컬 스토리지에서 유저 정보 로드
      let user = await loadUserFromStorage();
      
      // 저장된 정보가 없으면 바로 리턴
      if (!user) {
        setIsLoading(false);
        return null;
      }

      // 🚨 [핵심 추가] 유령 로그인 방지: 실제 Supabase 세션 검사 🚨
      const { data: { session } } = await supabase.auth.getSession();

      // 세션이 아예 없거나, 로컬에 저장된 ID와 실제 세션 ID가 다르다면?
      if (!session || session.user.id !== user.id) {
        console.warn("👻 유령 로그인 감지! (세션 만료 또는 불일치) -> 자동 로그아웃 처리");
        
        await clearAllStorage(); // 로컬 데이터 삭제 (초기화)
        setUserInfo(null);       // 상태 초기화
        return null;             // 로그인 안 된 것으로 처리
      }

      // 2. 세션이 유효하다면, DB에서 최신 정보(last_seen_at 등)를 갱신
      const { data: dbUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!error && dbUser) {
        // DB 정보와 로컬 정보를 합침 (DB가 우선)
        user = {
          ...user,
          name: dbUser.name,
          phone: dbUser.phone,
          emergency_contacts: dbUser.emergency_contacts,
          is_premium: dbUser.is_premium,
          is_admin: dbUser.is_admin, // 관리자 여부 동기화
        };
        
        // 최신 정보로 스토리지 업데이트
        await saveUserToStorage(user);
        console.log("✅ 유저 정보 동기화 완료 (DB -> Local)");
      } else {
        console.log("ℹ️ DB 동기화 실패(네트워크 등), 로컬 정보 사용");
      }
      
      setUserInfo(user);
      
      // 푸시 토큰 확인 및 갱신
      await registerPushToken(user);
      
      return user;

    } catch (error) {
      console.error('사용자 정보 불러오기 실패:', error);
      // 에러 나면 안전하게 로그아웃 처리하는 게 나을 수도 있음
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

      // 기존 토큰과 다를 때만 업데이트
      if (newToken !== user.push_token) {
        console.log('🔔 푸시 토큰 DB 업데이트...');
        
        const { error } = await supabase
          .from('users')
          .update({ push_token: newToken })
          .eq('id', user.id); // ✅ user_id -> id 수정

        if (!error) {
          await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, newToken);
          setUserInfo(prev => prev ? { ...prev, push_token: newToken } : null);
          console.log("✅ 토큰 업데이트 완료");
        }
      }
    } catch (error) {
      console.error('토큰 등록 오류:', error);
    }
  };

  /**
   * 회원가입/로그인
   */
  const registerOrLogin = async (name: string, phone: string): Promise<boolean> => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('입력 오류', '이름과 전화번호를 입력해주세요.');
      return false;
    }

    setIsLoading(true);

    try {
      // 1. 가짜 이메일/비번 생성
      const email = `${phone.trim()}@musosik.app`;
      const password = `musosik${phone.trim()}`;

      // 2. 로그인 시도
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      let session = signInData.session;
      let user = signInData.user;

      // 3. 로그인 실패 시 -> 회원가입 시도
      if (signInError) {
        console.log('로그인 실패, 신규 가입 시도...');
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        session = signUpData.session;
        user = signUpData.user;
      }

      // 4. 세션 확인
      if (!session || !user) {
        throw new Error('로그인 세션을 생성할 수 없습니다.');
      }

      const userId = user.id;

      // 5. DB에 정보 저장 (Upsert)
      const { data: userData, error: dbError } = await supabase
        .from('users')
        .upsert({
          id: userId,
          name: name.trim(),
          phone: phone.trim(),
          // last_seen_at은 여기서 업데이트 안 함 (출석체크 시 업데이트)
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // 6. 앱 내 상태 업데이트
      const userToSave: UserInfo = {
        id: userData.id,             // ✅ [필수] user_id -> id 로 변경 (DB 컬럼명 통일)
        role: userData.role,         // ✅ [필수] 역할 정보 추가
        
        name: userData.name,
        phone: userData.phone,
        
        // 새로 추가된 필드들도 챙겨주면 좋습니다 (없으면 null)
        pairing_code: userData.pairing_code || null,
        manager_id: userData.manager_id || null,
        nickname: userData.nickname || null,
        relation_tag: userData.relation_tag || null,
        
        emergency_contacts: userData.emergency_contacts || [],
        is_premium: userData.is_premium || false,
        push_token: userData.push_token || null,
        is_admin: userData.is_admin,
        
        // 💡 [호환성] 기존 코드들이 user_id를 찾을 수 있으니 당분간 같이 넣어둠
        user_id: userData.id, 
      };

      await saveUserToStorage(userToSave);
      setUserInfo(userToSave);
      
      await registerPushToken(userToSave);

      Alert.alert('반갑습니다!', `${userData.name}님, 오늘도 안녕하신가요?`);
      return true;

    } catch (error) {
      console.error('인증 처리 에러:', error);
      Alert.alert('오류', '로그인 처리에 실패했습니다. 잠시 후 다시 시도해주세요.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // ... (togglePremium, resetAllData 기존 유지)
  const togglePremium = async (): Promise<void> => {
    if (!userInfo) return;
    try {
      const newStatus = !userInfo.is_premium;
      const { error } = await supabase
        .from('users')
        .update({ is_premium: newStatus })
        .eq('id', userInfo.id); // ✅ user_id -> id 수정

      if (error) throw error;
      await savePremiumStatus(newStatus);
      setUserInfo({ ...userInfo, is_premium: newStatus });
      Alert.alert('변경 완료', newStatus ? '프리미엄 모드 활성화' : '무료 모드로 전환');
    } catch (e) { Alert.alert('오류', '상태 변경 실패'); }
  };

  const resetAllData = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut(); // 서버 로그아웃 추가
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