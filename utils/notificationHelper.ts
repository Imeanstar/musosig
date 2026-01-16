// utils/notificationHelper.ts - 푸시 알림 유틸리티
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * 푸시 알림 권한 요청 및 토큰 발급
 * @returns Expo Push Token (string) 또는 null
 */
export const registerForPushNotificationsAsync = async (): Promise<string | null> => {
  try {
    // 실제 기기인지 확인 (에뮬레이터는 푸시 알림 불가)
    if (!Device.isDevice) {
      console.log('⚠️ 푸시 알림은 실제 기기에서만 작동합니다.');
      return null;
    }

    // 1. 알림 권한 요청
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('⚠️ 푸시 알림 권한이 거부되었습니다.');
      return null;
    }

    // 2. Android용 알림 채널 설정
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // 3. Expo Push Token 발급
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    
    if (!projectId) {
      console.error('❌ Expo Project ID를 찾을 수 없습니다. app.json에 extra.eas.projectId를 추가하세요.');
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log('✅ Push Token 발급 성공:', token.data);
    
    return token.data;

  } catch (error) {
    console.error('❌ 푸시 알림 등록 실패:', error);
    return null;
  }
};

/**
 * 알림 핸들러 설정 (Foreground에서도 알림 표시)
 */
export const setupNotificationHandler = (): void => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
};
