// utils/date.ts - 날짜 관련 유틸리티 함수

/**
 * 오늘 날짜 0시 0분 0초의 ISO 문자열 반환
 */
export const getTodayStartISO = (): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString();
};

/**
 * 현재 시각의 ISO 문자열 반환
 */
export const getNowISO = (): string => {
  return new Date().toISOString();
};

/**
 * 로컬 날짜 문자열 반환 (예: "2026/1/16")
 */
export const getLocaleDateString = (): string => {
  return new Date().toLocaleDateString();
};
