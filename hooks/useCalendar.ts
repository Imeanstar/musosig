import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CheckInLog } from '../types'; 

// 🔥 [수정 1] 반환 타입 정의를 Set -> Map으로 변경
interface UseCalendarReturn {
  currentDate: Date;
  checkInLogs: Map<string, CheckInLog>; 
  isLoading: boolean;
  changeMonth: (delta: number) => void;
  getDaysInMonth: (date: Date) => { daysInMonth: number; startingDayOfWeek: number };
}

export const useCalendar = (
  memberId: string | undefined, 
  isPremium: boolean = false 
): UseCalendarReturn => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // 🔥 [수정 2] 상태(State)의 제네릭 타입도 Set -> Map으로 변경
  const [checkInLogs, setCheckInLogs] = useState<Map<string, CheckInLog>>(new Map());
  
  const [isLoading, setIsLoading] = useState(false);

  const fetchCheckInLogs = async () => {
    if (!memberId) return;

    setIsLoading(true);
    try {
      // 1. 조회 기간 설정 (프리미엄 6개월, 일반 2개월)
      const monthsToLookBack = isPremium ? 6 : 2;
      
      const limitDate = new Date();
      limitDate.setMonth(limitDate.getMonth() - monthsToLookBack);
      limitDate.setDate(1); 

      // 2. Supabase 쿼리
      const { data, error } = await supabase
        .from('check_in_logs')
        .select('id, member_id, created_at, check_in_type, proof_url')
        .eq('member_id', memberId)
        .gte('created_at', limitDate.toISOString());

      if (error) throw error;

      if (data) {
        // 3. Map으로 변환
        const logMap = new Map<string, CheckInLog>();
        data.forEach(log => {
          const dateKey = log.created_at.split('T')[0]; // YYYY-MM-DD
          logMap.set(dateKey, log); 
        });
        
        setCheckInLogs(logMap);
        console.log(`[Calendar] ${isPremium ? '프리미엄' : '일반'} 로그 조회 완료:`, logMap.size, '건');
      }
    } catch (e) {
      console.error('[Calendar] 로그 조회 실패:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return { 
      daysInMonth: new Date(year, month + 1, 0).getDate(), 
      startingDayOfWeek: new Date(year, month, 1).getDay() 
    };
  };

  useEffect(() => {
    fetchCheckInLogs();
  }, [memberId, currentDate, isPremium]);

  return {
    currentDate,
    checkInLogs,
    isLoading,
    changeMonth,
    getDaysInMonth,
  };
};