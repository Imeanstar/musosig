// app/index.tsx - 노인 생존 신고 앱 (리팩토링됨)
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { Settings, Crown } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { styles } from './styles';
import { UserInfo, MathProblem, LegalDocType } from '../types';
import { LEGAL_DOCUMENTS, MATH_CHALLENGE } from '../constants';
import { useUserManagement } from '../hooks/useUserManagement';
import { useCheckIn } from '../hooks/useCheckIn';
import { saveEmergencyContacts } from '../utils/storage';
import { getLocaleDateString } from '../utils/date';
import { setupNotificationHandler } from '../utils/notificationHelper';
import { RegisterModal } from '../components/modals/RegisterModal';
import { MathChallengeModal } from '../components/modals/MathChallengeModal';
import { SettingsModal } from '../components/modals/SettingsModal';
import { LegalModal } from '../components/LegalModal';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';// 👈 Crown이 없으면 추가하세요!
import { Platform } from 'react-native';

// 푸시 알림 핸들러 설정 (앱이 켜져있을 때도 알림 표시)
setupNotificationHandler();

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

  // 법률 문서 상태
  const [legalDoc, setLegalDoc] = useState(LEGAL_DOCUMENTS.terms);

  // 앱 시작 시 사용자 정보 로드
  useEffect(() => {
    initializeApp();
  }, []);

  // 사용자 정보 변경 시 출석 체크
  useEffect(() => {
    if (userInfo) {
      checkTodayCheckIn();
    }
  }, [userInfo]);

  /**
   * 앱 초기화
   */
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

  /**
   * 회원가입/로그인 처리
   */
  const handleRegister = async (name: string, phone: string): Promise<boolean> => {
    const success = await registerOrLogin(name, phone);
    if (success) {
      setShowRegisterModal(false);
    }
    return success;
  };

  /**
   * 수학 문제 생성
   */
  const generateMathProblem = (): void => {
    const num1 = Math.floor(Math.random() * (MATH_CHALLENGE.MAX_NUMBER - MATH_CHALLENGE.MIN_NUMBER + 1)) + MATH_CHALLENGE.MIN_NUMBER;
    const num2 = Math.floor(Math.random() * (MATH_CHALLENGE.MAX_NUMBER - MATH_CHALLENGE.MIN_NUMBER + 1)) + MATH_CHALLENGE.MIN_NUMBER;
    setMathProblem({ num1, num2, answer: num1 + num2 });
  };

  /**
   * 메인 버튼 클릭 (Premium/Free 분기)
   */
  const handleCheckInButtonPress = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); // 📳 묵직한 진동 쾅!
    }
    
    if (!userInfo) return;

    if (userInfo.is_premium) {
      // Premium: 수학 문제 풀기
      generateMathProblem();
      setShowMathModal(true);
    } else {
      // Free: 바로 출석
      performCheckIn();
    }
  };

  /**
   * 수학 문제 정답 처리
   */
  const handleMathCorrectAnswer = async (): Promise<void> => {
    setShowMathModal(false);
    await performCheckIn();
  };

  /**
   * 비상연락망 저장
   */
  const handleSaveContacts = async (contacts: string[]): Promise<void> => {
    if (!userInfo) return;

    try {
      // Supabase 업데이트
      const { error } = await supabase
        .from('users')
        .update({ emergency_contacts: contacts })
        .eq('id', userInfo.user_id);

      if (error) throw error;

      // 로컬 스토리지 업데이트
      await saveEmergencyContacts(contacts);

      // 상태 업데이트
      setUserInfo({ ...userInfo, emergency_contacts: contacts });

      Alert.alert('완료', '비상연락망이 저장되었습니다.');
    } catch (error) {
      Alert.alert('오류', '저장에 실패했습니다.');
    }
  };

  /**
   * 법률 문서 열기
   */
  // 기존 handleOpenLegal 함수를 지우고 이걸로 바꾸세요
  const handleOpenLegal = async (type: LegalDocType): Promise<void> => {
    const url = LEGAL_DOCUMENTS[type].url;

    try {
      // 시스템 브라우저(크롬/사파리)로 깔끔하게 열기
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('오류', '링크를 열 수 없습니다.');
    }
  };

  // app/index.tsx 안에 추가할 함수

const handlePremiumPress = () => {
  if (!userInfo) return;

  if (userInfo?.is_premium) {
    Alert.alert('정보', '이미 프리미엄 회원이십니다! 👑');
    return;
  }

  if (userInfo?.is_admin) {
    // 👑 관리자다! -> 바로 프리미엄 켜주기 (기존 togglePremium 함수 활용)
    togglePremium(); 
  } else {
    // 👶 일반인이다! -> "결제하세요" 모달 띄우기
    Alert.alert(
      '프리미엄 업그레이드',
      '프리미엄 회원이 되면 수학 문제를 풀고 뇌 건강도 챙길 수 있습니다!\n(현재는 베타 테스트 기간이라 무료로 제공됩니다.)',
      [
        { text: '닫기', style: 'cancel' },
        { 
          text: '무료 체험하기', 
          onPress: () => togglePremium(), // 지금은 착하니까 그냥 켜줌 (나중엔 결제창 연결)
          style: 'default'
        }
      ]
    );
  }
};

  /**
   * 데이터 초기화
   */
  const handleReset = async (): Promise<void> => {
    setIsLoading(true);
    setShowSettingsModal(false);

    try {
      await resetAllData();
      setIsChecked(false);
      setShowRegisterModal(true);

      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    } catch (error) {
      setIsLoading(false);
      Alert.alert('오류', '초기화 실패');
    }
  };

  // 로딩 화면
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
      {/* 모달들 */}
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



      {/* 메인 화면 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {/* 왼쪽: 날짜 및 인사말 */}
          <View>
            <Text style={styles.dateText}>{getLocaleDateString()}</Text>
            <Text style={styles.greetingText}>
              {userInfo ? `${userInfo.name}님, 안녕하세요!` : '안녕하세요!'}
            </Text>
            {/* 🔥 기존 'Premium 사용 중' 배지는 제거했습니다. 깔끔하죠? */}
          </View>
          
          {/* 오른쪽: 상단 아이콘 버튼들 */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* 👑 프리미엄 버튼 (추가됨!) */}
            <TouchableOpacity 
              onPress={handlePremiumPress} 
              style={{ marginRight: 16, padding: 4 }} // 터치 영역 확보 및 간격 조절
              activeOpacity={0.7}
            >
              <Crown
                size={28}
                // 프리미엄이면 금색으로 채우고, 아니면 회색 테두리만
                color={userInfo?.is_premium ? "#fbbf24" : "#9ca3af"}
                fill={userInfo?.is_premium ? "#fbbf24" : "none"}
              />
            </TouchableOpacity>

            {/* ⚙️ 설정 버튼 (기존 유지) */}
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

      <TouchableOpacity
        onPress={handleCheckInButtonPress}
        disabled={isChecked}
        style={styles.checkButton} // 기존 스타일에서 backgroundColor는 빼야 함
      >
        <LinearGradient
          // 완료되면 회색, 아니면 영롱한 파란+보라 그라데이션
          colors={isChecked ? ['#9ca3af', '#6b7280'] : ['#3b82f6', '#8b5cf6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ 
            width: '100%', height: '100%', 
            justifyContent: 'center', alignItems: 'center', 
            borderRadius: 20 // 버튼 둥글기
          }}
        >
          <Text style={styles.buttonText}>{isChecked ? '오늘 완료!' : '생존 신고하기'}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}
