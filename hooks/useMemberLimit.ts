/**
 * useMemberLimit.ts
 * - 멤버 추가 인원 제한 로직 전담
 */

import { Alert } from 'react-native';

const MAX_BASIC_MEMBERS = 3;
const MAX_PREMIUM_MEMBERS = 10;

export function useMemberLimit() {
  
  const checkCanAddMember = (
    currentCount: number, 
    isPremium: boolean,
    onUpgrade: () => void
  ): boolean => {
    
    // [Case 1] 일반 회원 3명 제한
    if (!isPremium && currentCount >= MAX_BASIC_MEMBERS) {
      Alert.alert(
        "멤버 추가 제한 🔒",
        `베이직 플랜은 최대 ${MAX_BASIC_MEMBERS}명까지만 등록 가능합니다.\n프리미엄으로 업그레이드하여 가족 모두를 지켜주세요!`,
        [
          { text: "취소", style: "cancel" },
          { text: "업그레이드", onPress: onUpgrade, style: "default" }
        ]
      );
      return false;
    }

    // [Case 2] 프리미엄 회원 10명 제한
    if (isPremium && currentCount >= MAX_PREMIUM_MEMBERS) {
      Alert.alert("등록 한도 초과", "최대 10명까지만 등록 가능합니다.");
      return false;
    }

    return true; // 통과
  };

  return { checkCanAddMember, MAX_BASIC_MEMBERS, MAX_PREMIUM_MEMBERS };
}
