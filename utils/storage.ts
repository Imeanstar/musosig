// utils/storage.ts - AsyncStorage 헬퍼 함수
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserInfo } from '../types';
import { STORAGE_KEYS } from '../constants';

/**
 * 사용자 정보를 AsyncStorage에 저장
 */
export const saveUserToStorage = async (user: UserInfo): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, user.user_id);
  await AsyncStorage.setItem(STORAGE_KEYS.USER_NAME, user.name);
  await AsyncStorage.setItem(STORAGE_KEYS.USER_PHONE, user.phone);
  await AsyncStorage.setItem(STORAGE_KEYS.EMERGENCY_CONTACTS, JSON.stringify(user.emergency_contacts));
  await AsyncStorage.setItem(STORAGE_KEYS.IS_PREMIUM, String(user.is_premium));
};

/**
 * AsyncStorage에서 사용자 정보 불러오기
 */
export const loadUserFromStorage = async (): Promise<UserInfo | null> => {
  const userId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
  
  if (!userId) return null;

  const name = await AsyncStorage.getItem(STORAGE_KEYS.USER_NAME);
  const phone = await AsyncStorage.getItem(STORAGE_KEYS.USER_PHONE);
  const contactsStr = await AsyncStorage.getItem(STORAGE_KEYS.EMERGENCY_CONTACTS);
  const isPremiumStr = await AsyncStorage.getItem(STORAGE_KEYS.IS_PREMIUM);

  return {
    user_id: userId,
    name: name || '',
    phone: phone || '',
    emergency_contacts: contactsStr ? JSON.parse(contactsStr) : [],
    is_premium: isPremiumStr === 'true',
  };
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
 * 모든 데이터 초기화
 */
export const clearAllStorage = async (): Promise<void> => {
  await AsyncStorage.clear();
};
