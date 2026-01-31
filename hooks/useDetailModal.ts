/**
 * useDetailModal.ts
 * - 날짜 상세 모달 상태 관리 Hook
 */

import { useState } from 'react';

interface DateLog {
  date: string;
  log: any | null;
}

export function useDetailModal() {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<DateLog | null>(null);
  const [showPhoto, setShowPhoto] = useState(false);

  const openDetail = (day: number, dateKey: string, log: any | null) => {
    const todayKey = new Date().toISOString().split('T')[0];
    
    // 미래 날짜 방지
    if (dateKey > todayKey) return;
    
    setShowPhoto(false); // 초기에는 사진 숨김
    setSelectedDate({ 
      date: `${new Date(dateKey).getMonth() + 1}월 ${day}일`, 
      log 
    });
    setIsVisible(true);
  };

  const closeDetail = () => {
    setIsVisible(false);
    setSelectedDate(null);
    setShowPhoto(false);
  };

  const togglePhoto = () => setShowPhoto(prev => !prev);

  return {
    isVisible,
    selectedDate,
    showPhoto,
    openDetail,
    closeDetail,
    togglePhoto
  };
}
