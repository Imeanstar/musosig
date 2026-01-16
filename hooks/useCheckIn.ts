// hooks/useCheckIn.ts - 출석 체크 커스텀 훅
import { useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { getTodayStartISO, getNowISO } from '../utils/date';
import { MESSAGES } from '../constants';

export const useCheckIn = (userId: string | null) => {
  const [isChecked, setIsChecked] = useState(false);

  /**
   * 오늘 출석 여부 확인
   */
  const checkTodayCheckIn = async (): Promise<void> => {
    if (!userId) return;

    try {
      const todayStartISO = getTodayStartISO();

      const { data, error } = await supabase
        .from('check_ins')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', todayStartISO)
        .limit(1);

      if (!error) {
        setIsChecked(data && data.length > 0);
      }
    } catch (error) {
      console.error('출석 확인 중 오류:', error);
    }
  };

  /**
   * 출석 체크 실행
   */
  const performCheckIn = async (): Promise<boolean> => {
    if (!userId) return false;

    try {
      // check_ins 테이블에 기록
      const { error: checkInError } = await supabase
        .from('check_ins')
        .insert({ user_id: userId });

      if (checkInError) throw checkInError;

      // users 테이블의 last_seen_at 업데이트
      await supabase
        .from('users')
        .update({ last_seen_at: getNowISO() })
        .eq('id', userId);

      setIsChecked(true);
      Alert.alert('성공', MESSAGES.CHECKIN_SUCCESS);
      return true;
    } catch (error) {
      console.error('출석 체크 실패:', error);
      Alert.alert('오류', MESSAGES.CHECKIN_ERROR);
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
