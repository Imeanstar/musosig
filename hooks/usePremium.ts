import { useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { UserInfo } from '../types';
import { saveUserToStorage } from '../utils/storage';

// 이 훅은 "유저 정보(userInfo)"와 "정보를 업데이트하는 함수(setUserInfo)"를 재료로 받습니다.
export const usePremium = (userInfo: UserInfo | null, setUserInfo: (user: UserInfo) => void) => {
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. 프리미엄 업그레이드 (결제 성공 시)
  const upgradeToPremium = async (): Promise<boolean> => {
    if (!userInfo) return false;
    
    try {
      setIsProcessing(true);

      // DB 업데이트
      const { error } = await supabase
        .from('users')
        .update({ 
          is_premium: true, 
          updated_at: new Date() 
        })
        .eq('id', userInfo.id);

      if (error) throw error;

      // 로컬 상태 업데이트
      const updatedUser = { ...userInfo, is_premium: true };
      setUserInfo(updatedUser); // 화면 즉시 반영
      await saveUserToStorage(updatedUser); // 앱 껐다 켜도 유지

      Alert.alert("감사합니다! 🎉", "프리미엄 회원이 되셨습니다.\n모든 기능을 제한 없이 이용하세요!");
      return true;

    } catch (e) {
      console.error(e);
      Alert.alert("오류", "업그레이드 처리 중 문제가 발생했습니다.");
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. 기능 제한 체크 (예: 멤버 수 제한, 달력 조회 제한 등)
  // 매번 if문 쓰지 말고, 이 함수 하나로 체크하면 편합니다.
  const checkFeatureLimit = (feature: 'MEMBER_COUNT' | 'CALENDAR_VIEW', currentCount?: number): boolean => {
    if (userInfo?.is_premium) return true; // 프리미엄이면 무조건 통과

    if (feature === 'MEMBER_COUNT') {
      // 무료는 1명까지만
      if ((currentCount || 0) >= 1) {
        Alert.alert("프리미엄 기능 👑", "무료 버전은 멤버를 1명만 등록할 수 있습니다.");
        return false;
      }
    }
    
    if (feature === 'CALENDAR_VIEW') {
      // (달력 로직은 상황에 따라 UI에서 처리하는 게 나을 수도 있음)
       Alert.alert("프리미엄 기능 👑", "과거 기록 조회는 프리미엄 전용입니다.");
       return false;
    }

    return true;
  };

  return {
    isProcessing,
    upgradeToPremium,
    checkFeatureLimit
  };
};