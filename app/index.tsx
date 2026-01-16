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
  const handleCheckInButtonPress = (): void => {
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
          onTogglePremium={togglePremium}
          onOpenLegal={handleOpenLegal}
          onReset={handleReset}
        />
      )}


      {/* 메인 화면 */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.dateText}>{getLocaleDateString()}</Text>
            <Text style={styles.greetingText}>
              {userInfo ? `${userInfo.name}님, 안녕하세요!` : '안녕하세요!'}
            </Text>
            {userInfo?.is_premium && (
              <View style={styles.premiumBadge}>
                <Crown size={16} color="#92400e" fill="#fbbf24" />
                <Text style={styles.premiumBadgeText}>Premium 사용 중</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={() => setShowSettingsModal(true)} style={styles.settingsIcon}>
            <Settings size={28} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        onPress={handleCheckInButtonPress}
        disabled={isChecked}
        style={[styles.checkButton, isChecked ? styles.buttonChecked : styles.buttonUnchecked]}
      >
        <Text style={styles.buttonText}>{isChecked ? '완료' : '생존 신고'}</Text>
      </TouchableOpacity>
    </View>
  );
}
