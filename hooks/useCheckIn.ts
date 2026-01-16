// hooks/useCheckIn.ts
import { useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { MESSAGES } from '../constants';

export const useCheckIn = (userId: string | null) => {
  const [isChecked, setIsChecked] = useState(false);

  /**
   * 오늘 출석 여부 확인
   * 로직: users 테이블의 last_seen_at이 '오늘 0시' 이후인지 확인
   */
  const checkTodayCheckIn = async (): Promise<void> => {
    // 🛡️ 1. userId 없으면 명확히 false로 설정
    if (!userId) {
      setIsChecked(false);
      return;
    }

    try {
      // 최신 유저 정보 가져오기
      const { data, error } = await supabase
        .from('users')
        .select('last_seen_at')
        .eq('id', userId)
        .single();

      if (error) throw error;

      // 🛡️ 2. data가 없는 경우 명시적 처리
      if (!data) {
        console.warn('⚠️ 사용자 데이터를 찾을 수 없습니다.');
        setIsChecked(false);
        return;
      }

      // 🛡️ 3. last_seen_at이 null인 경우 명시적 처리 (신규 가입자)
      if (!data.last_seen_at) {
        console.log('ℹ️ 아직 출석한 적이 없습니다. (신규 가입자)');
        setIsChecked(false);
        return;
      }

      // 🛡️ 4. 정상 케이스: 날짜 비교
      const lastSeen = new Date(data.last_seen_at);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // 오늘 0시 0분 0초

      if (lastSeen >= today) {
        console.log('✅ 오늘 이미 출석했습니다.');
        setIsChecked(true);
      } else {
        console.log('❌ 아직 출석하지 않았습니다.');
        setIsChecked(false);
      }
    } catch (error) {
      console.error('❌ 출석 확인 중 오류:', error);
      // 🛡️ 5. 에러 발생 시 안전한 기본값 제공
      setIsChecked(false);
    }
  };

  /**
   * 출석 체크 실행 (생존신고 버튼 클릭)
   */
  const performCheckIn = async (): Promise<boolean> => {
    if (!userId) return false;

    try {
      const nowISO = new Date().toISOString();

      // users 테이블의 last_seen_at 업데이트 (이게 핵심!)
      const { error } = await supabase
        .from('users')
        .update({ last_seen_at: nowISO })
        .eq('id', userId);

      if (error) throw error;

      // 성공 처리
      setIsChecked(true);
      Alert.alert('성공', '오늘의 생존신고가 완료되었습니다! 👍');
      return true;

    } catch (error) {
      console.error('출석 체크 실패:', error);
      Alert.alert('오류', MESSAGES.CHECKIN_ERROR || '처리 중 오류가 발생했습니다.');
      return false;
    }
  };

  return {
    isChecked,
    setIsChecked,
    checkTodayCheckIn,
    performCheckIn,
  };
};