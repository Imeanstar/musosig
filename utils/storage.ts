// utils/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants'; 
import { UserInfo, UserRole } from '../types';

/**
 * 사용자 정보 저장 (모든 필드 저장)
 */
export const saveUserToStorage = async (user: UserInfo): Promise<void> => {
  try {
    const updates: [string, string][] = [
      [STORAGE_KEYS.USER_ID, user.id],
      // 이름이 없을 경우를 대비해 기본값 처리
      [STORAGE_KEYS.USER_NAME, user.name || '이름 없음'], 
      
      // 🔥 [핵심 수정] phone이 null이면 빈 문자열('')로 바꿔서 저장
      [STORAGE_KEYS.USER_PHONE, user.phone || ''], 
      
      // [필수] 역할 저장
      [STORAGE_KEYS.USER_ROLE, user.role], 
    ];

    // 선택적 필드들은 값이 있을 때만 저장 (if문 덕분에 안전함)
    if (user.emergency_contacts) {
      updates.push([STORAGE_KEYS.EMERGENCY_CONTACTS, JSON.stringify(user.emergency_contacts)]);
    }
    if (user.push_token) {
      updates.push([STORAGE_KEYS.PUSH_TOKEN, user.push_token]);
    }
    
    // [v1.2 신규 필드 저장]
    if (user.pairing_code) updates.push([STORAGE_KEYS.PAIRING_CODE, user.pairing_code]);
    if (user.manager_id) updates.push([STORAGE_KEYS.MANAGER_ID, user.manager_id]);
    if (user.nickname) updates.push([STORAGE_KEYS.NICKNAME, user.nickname]);
    
    // 프리미엄 여부 (boolean -> string 변환)
    updates.push([STORAGE_KEYS.IS_PREMIUM, String(user.is_premium || false)]);

    await AsyncStorage.multiSet(updates);
    // console.log("✅ 스토리지 저장 완료"); // 디버깅용 로그

  } catch (error) {
    console.error('스토리지 저장 실패:', error);
  }
};

/**
 * 사용자 정보 불러오기
 */
export const loadUserFromStorage = async (): Promise<UserInfo | null> => {
  try {
    const userId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
    
    // ID가 없으면 로그인이 안 된 것으로 간주
    if (!userId) return null;

    // 한 번에 다 불러오기 (성능 향상)
    const values = await AsyncStorage.multiGet([
      STORAGE_KEYS.USER_NAME,
      STORAGE_KEYS.USER_PHONE,
      STORAGE_KEYS.USER_ROLE,         // 역할 불러오기
      STORAGE_KEYS.EMERGENCY_CONTACTS,
      STORAGE_KEYS.IS_PREMIUM,
      STORAGE_KEYS.PUSH_TOKEN,
      STORAGE_KEYS.PAIRING_CODE,
      STORAGE_KEYS.MANAGER_ID,
      STORAGE_KEYS.NICKNAME
    ]);

    // 값을 객체로 변환
    const data = Object.fromEntries(values);

    // 역할(Role) 기본값 처리
    const role = (data[STORAGE_KEYS.USER_ROLE] as UserRole) || 'manager';

    // 🚨 [수정 완료] 여기서 변수를 정의해줍니다!
    const contactsJson = data[STORAGE_KEYS.EMERGENCY_CONTACTS];

    return {
      id: userId,
      role: role,
      
      name: data[STORAGE_KEYS.USER_NAME] || '',
      phone: data[STORAGE_KEYS.USER_PHONE] || '',
      
      // 선택적 필드들 복구
      pairing_code: data[STORAGE_KEYS.PAIRING_CODE] || null,
      manager_id: data[STORAGE_KEYS.MANAGER_ID] || null,
      nickname: data[STORAGE_KEYS.NICKNAME] || null,
      
      // 이제 contactsJson 변수를 찾을 수 있습니다!
      emergency_contacts: contactsJson ? JSON.parse(contactsJson) : [],
        
      is_premium: data[STORAGE_KEYS.IS_PREMIUM] === 'true',
      push_token: data[STORAGE_KEYS.PUSH_TOKEN] || null,
      
      // 호환성 유지
      user_id: userId,
    };
  } catch (error) {
    console.error('스토리지 로드 실패:', error);
    return null;
  }
};

/**
 * 비상연락망만 업데이트
 */
export const saveEmergencyContacts = async (contacts: string[]): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEYS.EMERGENCY_CONTACTS, JSON.stringify(contacts));
};

/**
 * Premium 상태만 업데이트
 */
export const savePremiumStatus = async (isPremium: boolean): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEYS.IS_PREMIUM, String(isPremium));
};

/**
 * 모든 데이터 초기화 (로그아웃 시 사용)
 */
export const clearAllStorage = async (): Promise<void> => {
  try {
    const keys = Object.values(STORAGE_KEYS);
    await AsyncStorage.multiRemove(keys);
  } catch (e) {
    console.error('스토리지 초기화 실패', e);
  }
};