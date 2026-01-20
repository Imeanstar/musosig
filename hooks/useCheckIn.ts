import { useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { MESSAGES } from '../constants';

export const useCheckIn = (userId: string | null) => {
  const [isChecked, setIsChecked] = useState(false);

  /**
   * 📅 한국 시간(KST) 기준 날짜 문자열(YYYY-MM-DD) 추출 함수
   * 핸드폰이 미국 시간이든 영국 시간이든 무조건 "한국 날짜"를 뱉어냅니다.
   */
  const getKoreanDateString = (isoString: string | Date | null) => {
    if (!isoString) return null;
    
    const date = new Date(isoString);
    
    // 1. 현재 시간(UTC)에 9시간(KST 보정값)을 더함
    // 9시간 = 9 * 60분 * 60초 * 1000밀리초
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(date.getTime() + kstOffset);

    // 2. ISOString으로 변환 후 앞의 날짜 부분만 자름 (YYYY-MM-DD)
    // 예: 2026-01-20T09:34:00... -> "2026-01-20"
    return kstDate.toISOString().split('T')[0];
  };

  /**
   * 오늘 출석 여부 확인
   */
  const checkTodayCheckIn = async (): Promise<void> => {
    if (!userId) {
      setIsChecked(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('last_seen_at')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      // 데이터가 없거나 출석 기록이 아예 없으면 false
      if (!data || !data.last_seen_at) {
        setIsChecked(false);
        return;
      }

      // 🔍 날짜 문자열로 단순 비교 (시간 무시)
      const lastCheckInDate = getKoreanDateString(data.last_seen_at); // DB기록 -> 한국날짜
      const todayDate = getKoreanDateString(new Date());              // 지금 -> 한국날짜

      console.log(`🔎 날짜 비교: DB기록(${lastCheckInDate}) vs 오늘(${todayDate})`);

      if (lastCheckInDate === todayDate) {
        setIsChecked(true); // 날짜 글자가 같으면 오늘 한 거임!
      } else {
        setIsChecked(false);
      }

    } catch (error) {
      console.error('❌ 출석 확인 중 오류:', error);
      setIsChecked(false);
    }
  };

  /**
   * 출석 체크 실행 (생존신고 버튼 클릭)
   */
  const performCheckIn = async (): Promise<boolean> => {
    if (!userId) {
      console.error("❌ 오류: userId가 없습니다. 로그인이 풀렸나 확인하세요.");
      return false;
    }

    try {
      // 👇 [추가] 현재 진짜 로그인 세션 상태 확인
      const { data: { session } } = await supabase.auth.getSession();
      const currentAuthId = session?.user?.id;

      console.log(`🕵️‍♂️ [범인 찾기]`);
      console.log(`📱 앱이 알고 있는 ID: ${userId}`);
      console.log(`🔐 Supabase가 인식하는 ID: ${currentAuthId}`);

      if (currentAuthId !== userId) {
        console.error("🚨 [불일치 발생] 앱은 로그인됐다고 생각하지만, 실제 세션은 다르거나 만료됨!");
        Alert.alert("세션 만료", "보안을 위해 다시 로그인해주세요.");
        return false; // 여기서 멈춤
      }

      const nowISO = new Date().toISOString(); 

      // 👇 .select()를 붙여서 "업데이트된 결과"를 반환받습니다.
      const { data, error } = await supabase
        .from('users')
        .update({ last_seen_at: nowISO })
        .eq('id', userId)
        .select(); // <--- 이게 있어야 진짜 수정됐는지 확인 가능!

      if (error) throw error;

      // 🔍 여기서 중요! 수정된 데이터가 없으면(length === 0) RLS 문제임
      if (!data || data.length === 0) {
        console.error("⚠️ 경고: 업데이트 요청은 갔으나 수정된 행이 0개입니다. (RLS 정책 문제)");
        Alert.alert("오류", "내 정보를 수정할 권한이 없습니다. Supabase 정책을 확인하세요.");
        return false;
      }

      console.log("✅ DB 업데이트 성공! 변경된 데이터:", data);

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