/**
 * useCalendar.ts
 * 
 * 멤버 체크인 캘린더 Hook
 * - 월별 체크인 로그 조회
 * - 월 이동
 * - 날짜 계산
 * 
 * @extracted from ManagerMain.tsx (185-223줄)
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface UseCalendarReturn {
  currentDate: Date;
  checkInLogs: Set<string>;
  isLoading: boolean;
  changeMonth: (delta: number) => void;
  getDaysInMonth: (date: Date) => { daysInMonth: number; startingDayOfWeek: number };
}

export const useCalendar = (memberId: string | undefined): UseCalendarReturn => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [checkInLogs, setCheckInLogs] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  /**
   * 체크인 로그 조회
   */
  const fetchCheckInLogs = async () => {
    if (!memberId) return;

    setIsLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

      const { data } = await supabase
        .from('check_in_logs')
        .select('created_at')
        .eq('member_id', memberId)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (data) {
        const logSet = new Set<string>();
        data.forEach(log => logSet.add(log.created_at.split('T')[0]));
        setCheckInLogs(logSet);
        console.log('[Calendar] 로그 조회 완료:', logSet.size, '일');
      }
    } catch (e) {
      console.error('[Calendar] 로그 조회 실패:', e);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 월 변경
   */
  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  /**
   * 월 정보 계산 (일수, 시작 요일)
   */
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return { 
      daysInMonth: new Date(year, month + 1, 0).getDate(), 
      startingDayOfWeek: new Date(year, month, 1).getDay() 
    };
  };

  // memberId나 currentDate 변경 시 자동 조회
  useEffect(() => {
    fetchCheckInLogs();
  }, [memberId, currentDate]);

  return {
    currentDate,
    checkInLogs,
    isLoading,
    changeMonth,
    getDaysInMonth,
  };
};
