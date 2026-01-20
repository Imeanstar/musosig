import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Linking, Platform } from 'react-native';
import { Settings, Crown } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { styles } from '../styles/styles';
import { MathProblem, LegalDocType } from '../types';
import { LEGAL_DOCUMENTS, MATH_CHALLENGE } from '../constants';
import { useUserManagement } from '../hooks/useUserManagement';
import { useCheckIn } from '../hooks/useCheckIn';
import { saveEmergencyContacts } from '../utils/storage';
import { getLocaleDateString } from '../utils/date';
import { RegisterModal } from '../components/modals/RegisterModal';
import { MathChallengeModal } from '../components/modals/MathChallengeModal';
import { SettingsModal } from '../components/modals/SettingsModal';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

// 👇 알림 관련 임포트
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// 1. 알림 핸들러 설정 (앱이 켜져 있을 때도 알림 수신)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function Index() {
  // 커스텀 훅
  const {
    userInfo,
    setUserInfo,
    isLoading,
    setIsLoading,
    loadUser,
    registerOrLogin,
    togglePremium,
    resetAllData,
  } = useUserManagement();

  const { isChecked, setIsChecked, checkTodayCheckIn, performCheckIn } = useCheckIn(
    userInfo?.user_id || null
  );

  // 모달 상태
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showMathModal, setShowMathModal] = useState(false);

  // 수학 문제 상태
  const [mathProblem, setMathProblem] = useState<MathProblem>({ num1: 0, num2: 0, answer: 0 });

  // 앱 시작 시 초기화
  useEffect(() => {
    initializeApp();
  }, []);

  // 👇 [핵심] 유저 정보가 로드되면 -> 토큰 발급 & DB 저장 자동 실행
  useEffect(() => {
    if (userInfo?.user_id) {
      registerAndSaveToken();
      checkTodayCheckIn(); // 출석 여부도 확인
    }
  }, [userInfo]);

  const initializeApp = async () => {
    try {
      setIsLoading(true);
      const user = await loadUser();
      
      if (!user) {
        setShowRegisterModal(true);
      }
    } catch (error) {
      console.error('앱 초기화 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 토큰 발급 및 Supabase 저장 통합 함수
  const registerAndSaveToken = async () => {
    try {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        console.log("📢 알림 토큰 발급 완료:", token);
        
        // Supabase에 저장
        const { error } = await supabase
          .from('users')
          .update({ push_token: token })
          .eq('id', userInfo?.user_id);

        if (error) console.error("❌ 토큰 저장 실패:", error);
        else console.log("✅ Supabase에 토큰 저장 성공");
      }
    } catch (e) {
      console.error("토큰 등록 중 에러:", e);
    }
  };

  const handleRegister = async (name: string, phone: string): Promise<boolean> => {
    const success = await registerOrLogin(name, phone);
    if (success) {
      setShowRegisterModal(false);
    }
    return success;
  };

  const generateMathProblem = (): void => {
    const num1 = Math.floor(Math.random() * (MATH_CHALLENGE.MAX_NUMBER - MATH_CHALLENGE.MIN_NUMBER + 1)) + MATH_CHALLENGE.MIN_NUMBER;
    const num2 = Math.floor(Math.random() * (MATH_CHALLENGE.MAX_NUMBER - MATH_CHALLENGE.MIN_NUMBER + 1)) + MATH_CHALLENGE.MIN_NUMBER;
    setMathProblem({ num1, num2, answer: num1 + num2 });
  };

  const handleCheckInButtonPress = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    
    if (!userInfo) return;

    if (userInfo.is_premium) {
      generateMathProblem();
      setShowMathModal(true);
    } else {
      performCheckIn();
    }
  };

  const handleMathCorrectAnswer = async (): Promise<void> => {
    setShowMathModal(false);
    await performCheckIn();
  };

  const handleSaveContacts = async (contacts: string[]): Promise<void> => {
    if (!userInfo) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ emergency_contacts: contacts })
        .eq('id', userInfo.user_id);

      if (error) throw error;
      await saveEmergencyContacts(contacts);
      setUserInfo({ ...userInfo, emergency_contacts: contacts });
      Alert.alert('완료', '비상연락망이 저장되었습니다.');
    } catch (error) {
      Alert.alert('오류', '저장에 실패했습니다.');
    }
  };

  const handleOpenLegal = async (type: LegalDocType): Promise<void> => {
    const url = LEGAL_DOCUMENTS[type].url;
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('오류', '링크를 열 수 없습니다.');
    }
  };

  const handlePremiumPress = () => {
    if (!userInfo) return;
    if (userInfo?.is_premium) {
      Alert.alert('정보', '이미 프리미엄 회원이십니다! 👑');
      return;
    }
    // 관리자 모드 등은 필요한 경우 유지
    if (userInfo?.is_admin) {
      togglePremium(); 
    } else {
      Alert.alert(
        '프리미엄 업그레이드',
        '프리미엄 회원이 되면 수학 문제를 풀고 뇌 건강도 챙길 수 있습니다!',
        [
          { text: '닫기', style: 'cancel' },
          { text: '무료 체험하기', onPress: () => togglePremium(), style: 'default' }
        ]
      );
    }
  };

  const handleReset = async (): Promise<void> => {
    setIsLoading(true);
    setShowSettingsModal(false);
    try {
      await resetAllData();
      setIsChecked(false);
      setShowRegisterModal(true);
      setTimeout(() => setIsLoading(false), 500);
    } catch (error) {
      setIsLoading(false);
      Alert.alert('오류', '초기화 실패');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>잠시만 기다려주세요...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 모달 컴포넌트들 */}
      <RegisterModal visible={showRegisterModal} onRegister={handleRegister} />

      <MathChallengeModal
        visible={showMathModal}
        problem={mathProblem}
        onCorrectAnswer={handleMathCorrectAnswer}
      />

      {userInfo && (
        <SettingsModal
          visible={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          userInfo={userInfo}
          onSaveContacts={handleSaveContacts}
          onOpenLegal={handleOpenLegal}
          onReset={handleReset}
        />
      )}

      {/* 헤더 영역 */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.dateText}>{getLocaleDateString()}</Text>
            <Text style={styles.greetingText}>
              {userInfo ? `${userInfo.name}님, 안녕하세요!` : '안녕하세요!'}
            </Text>
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity 
              onPress={handlePremiumPress} 
              style={{ marginRight: 16, padding: 4 }}
              activeOpacity={0.7}
            >
              <Crown
                size={28}
                color={userInfo?.is_premium ? "#fbbf24" : "#9ca3af"}
                fill={userInfo?.is_premium ? "#fbbf24" : "none"}
              />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setShowSettingsModal(true)} 
              style={styles.settingsIcon}
              activeOpacity={0.7}
            >
              <Settings size={28} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 메인 생존 신고 버튼 */}
      <TouchableOpacity
        onPress={handleCheckInButtonPress}
        disabled={isChecked}
        style={styles.checkButton}
      >
        <LinearGradient
          colors={isChecked ? ['#9ca3af', '#6b7280'] : ['#3b82f6', '#8b5cf6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ 
            width: '100%', height: '100%', 
            justifyContent: 'center', alignItems: 'center', 
            borderRadius: 20 
          }}
        >
          <Text style={styles.buttonText}>{isChecked ? '오늘 완료!' : '생존 신고하기'}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

// 👇 토큰 발급 함수 (핵심 로직 유지)
async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return; 

  let token;
  
  // 1. 안드로이드 채널 설정 (우리가 고생해서 뚫은 부분!)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: '기본 알림', // 채널 이름 한글로 변경
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  // 2. 권한 확인
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    Alert.alert('알림 권한 필요', '설정에서 알림 권한을 허용해주세요!');
    return;
  }

  // 3. 토큰 가져오기
  // EAS Project ID 자동 감지 (안전하게 처리)
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  
  try {
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: projectId, 
    })).data;
  } catch (e) {
    console.error("토큰 발급 실패:", e);
  }

  return token;
}