import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';

export function useCheckIn(userId: string | null) {
  const [isChecked, setIsChecked] = useState(false);
  // 👇 [추가됨] 로딩 상태 관리
  const [isLoading, setIsLoading] = useState(false);

  // 오늘 이미 출석했는지 확인
  const checkTodayCheckIn = useCallback(async () => {
    if (!userId) return;
    
    setIsLoading(true); // 로딩 시작
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      const { data, error } = await supabase
        .from('check_in_logs')
        .select('id') // 존재 여부만 알면 되므로 id만 조회
        .eq('member_id', userId)
        .gte('created_at', `${today}T00:00:00`) // 오늘 0시부터
        .lte('created_at', `${today}T23:59:59`) // 오늘 밤까지
        .maybeSingle(); // 없으면 null 반환

      if (error) throw error;
      
      setIsChecked(!!data); // 데이터가 있으면 true
    } catch (error) {
      console.error('출석 확인 실패:', error);
    } finally {
      setIsLoading(false); // 로딩 끝
    }
  }, [userId]);

  // 출석 체크 실행 (DB 저장)
  const performCheckIn = async (): Promise<boolean> => {
    if (!userId) return false;

    setIsLoading(true); // 로딩 시작
    try {
      const { error } = await supabase
        .from('check_in_logs')
        .insert({ member_id: userId });

      if (error) throw error;
      
      setIsChecked(true); // 화면 즉시 반영
      return true;
    } catch (error) {
      console.error('생존신고 실패:', error);
      Alert.alert('오류', '생존신고 저장에 실패했습니다. 다시 시도해주세요.');
      return false;
    } finally {
      setIsLoading(false); // 로딩 끝
    }
  };

  return { 
    isChecked, 
    setIsChecked,
    isLoading, // 👈 [핵심] 이제 MemberMain에서 이걸 가져갈 수 있습니다!
    checkTodayCheckIn, 
    performCheckIn 
  };
}