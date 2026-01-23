import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome, Ionicons } from '@expo/vector-icons'; // 아이콘 추가
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';

// Hooks & Utils
import { useUserManagement } from '../hooks/useUserManagement';

// Components
import { ManagerMain } from '../components/ManagerMain';
import { AuthManager } from '../components/AuthManager';
import { MemberPairing } from '../components/MemberPairing';
import { MemberMain } from '../components/MemberMain';

// 1. 알림 핸들러 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// 화면 단계 정의
type ViewState = 'role_selection' | 'login_method' | 'auth_manager' | 'member_pairing';

export default function Index() {
  const { 
    userInfo, isLoading, loadUser, performOAuth, resetAllData 
  } = useUserManagement();
  
  // 초기 상태: 역할 선택 화면
  const [currentView, setCurrentView] = useState<ViewState>('role_selection');

  // 1. 앱 시작 시 유저 정보 로드
  useEffect(() => {
    loadUser();
  }, []);

  // 2. 로그인 성공 시 -> 알림 토큰 저장
  useEffect(() => {
    if (userInfo?.id) {
      registerAndSaveToken(userInfo.id);
    }
  }, [userInfo]);

  // 🚪 로그아웃 핸들러
  const handleLogout = async () => {
    Alert.alert("로그아웃", "정말 로그아웃 하시겠습니까?", [
      { text: "취소", style: "cancel" },
      { 
        text: "로그아웃", 
        style: "destructive",
        onPress: async () => {
          try {
            await resetAllData();
            setCurrentView('role_selection'); // 첫 화면으로 리셋
          } catch (e) {
            console.error("로그아웃 실패:", e);
          }
        } 
      }
    ]);
  };

  // 🔄 로딩 중
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ea580c" />
        <Text style={{ marginTop: 10, color: '#666' }}>로딩 중...</Text>
      </View>
    );
  }

  // ✅ [수정] 로그인 된 유저 처리
  if (userInfo) {
    // 🛑 1. 전화번호가 없으면 -> AuthManager를 'social_finish' 모드로 보여줌!
    if (!userInfo.phone) {
      return (
        <AuthManager 
          onBack={handleLogout} // 뒤로가기 누르면 로그아웃(처음부터 다시)
          initialMode="social_finish" // 👈 "추가 정보 입력 모드" 발동
          socialUser={userInfo}       // 👈 현재 정보(이름 등) 넘겨줌
        />
      );
    }

    // ✅ 2. 전화번호도 있으면 -> 정상적으로 메인 화면 진입
    if (userInfo.role === 'member') {
      return <MemberMain onBack={handleLogout} />; 
    }
    return <ManagerMain userInfo={userInfo} onBack={handleLogout} />;
  }

  // ❌ [상태 2] 로그인 전 화면 분기

  // ---------------------------------------------------------
  // 1. 역할 선택 화면 (Role Selection) - 가장 첫 화면
  // ---------------------------------------------------------
  if (currentView === 'role_selection') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        <View style={styles.contentContainer}>
          
          <View style={styles.logoSection}>
            <Text style={styles.logoText}>무소식</Text>
            <Text style={styles.subText}>가장 따뜻한 안부 확인 서비스</Text>
          </View>

          <View style={styles.roleContainer}>
            <Text style={styles.questionText}>누구신가요?</Text>
            
            {/* 보호자(매니저) 버튼 */}
            <TouchableOpacity 
              style={styles.roleCard} 
              activeOpacity={0.8}
              onPress={() => setCurrentView('login_method')} // 로그인 방식 선택으로 이동
            >
              <View style={[styles.iconCircle, { backgroundColor: '#eff6ff' }]}>
                 <Ionicons name="shield-checkmark" size={32} color="#3b82f6" />
              </View>
              <View style={styles.textGroup}>
                <Text style={styles.roleTitle}>보호자 (자녀)</Text>
                <Text style={styles.roleDesc}>부모님의 안부를 확인하고 싶어요</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#cbd5e1" />
            </TouchableOpacity>

            {/* 부모님(멤버) 버튼 */}
            <TouchableOpacity 
              style={styles.roleCard} 
              activeOpacity={0.8}
              onPress={() => setCurrentView('member_pairing')} // 바로 코드 입력으로 이동
            >
              <View style={[styles.iconCircle, { backgroundColor: '#fff7ed' }]}>
                 <Ionicons name="heart" size={32} color="#ea580c" />
              </View>
              <View style={styles.textGroup}>
                <Text style={styles.roleTitle}>부모님 (어르신)</Text>
                <Text style={styles.roleDesc}>자녀와 연결하고 싶어요</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#cbd5e1" />
            </TouchableOpacity>
          </View>

        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------
  // 2. 로그인 방식 선택 (Login Method) - 보호자 선택 시 뜸
  // ---------------------------------------------------------
  if (currentView === 'login_method') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.contentContainer}>
          
          <TouchableOpacity onPress={() => setCurrentView('role_selection')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>

          <View style={styles.headerSection}>
            <Text style={styles.headerTitle}>반갑습니다!</Text>
            <Text style={styles.headerSub}>어떻게 시작하시겠어요?</Text>
          </View>

          <View style={styles.buttonSection}>
            {/* 이메일 로그인 */}
            <TouchableOpacity 
              style={styles.primaryButton} 
              onPress={() => setCurrentView('auth_manager')}
            >
              <Text style={styles.primaryButtonText}>이메일로 시작하기</Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>또는 소셜 계정으로</Text>
              <View style={styles.line} />
            </View>

            {/* 카카오 */}
            <TouchableOpacity 
              style={[styles.socialButton, { backgroundColor: '#FEE500' }]} 
              onPress={() => performOAuth('kakao')}
            >
              <FontAwesome name="comment" size={20} color="#3C1E1E" style={{ marginRight: 10 }} />
              <Text style={[styles.socialButtonText, { color: '#3C1E1E' }]}>카카오로 시작하기</Text>
            </TouchableOpacity>

            {/* 구글 */}
            <TouchableOpacity 
              style={[styles.socialButton, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#e5e7eb' }]} 
              onPress={() => performOAuth('google')}
            >
              <FontAwesome name="google" size={20} color="#333" style={{ marginRight: 10 }} />
              <Text style={[styles.socialButtonText, { color: '#333' }]}>Google로 시작하기</Text>
            </TouchableOpacity>
          </View>

        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------
  // 3. 이메일 로그인/가입 화면 (AuthManager)
  // ---------------------------------------------------------
  if (currentView === 'auth_manager') {
    return (
      <AuthManager 
        onBack={() => setCurrentView('login_method')} // 뒤로가기 시 방식 선택으로
      />
    );
  }

  // ---------------------------------------------------------
  // 4. 멤버 페어링 화면 (MemberPairing)
  // ---------------------------------------------------------
  if (currentView === 'member_pairing') {
    return (
      <MemberPairing
        onBack={() => setCurrentView('role_selection')} // 뒤로가기 시 역할 선택으로
        onPairingComplete={async () => {
          await loadUser(); // 완료되면 유저 로드 -> 자동 이동
        }}
      />
    );
  }

  return null;
}

// ... (토큰 관련 함수 registerAndSaveToken, registerForPushNotificationsAsync는 기존과 동일하게 유지)
// 👇 토큰 발급 및 저장 로직 (컴포넌트 외부 함수)
async function registerAndSaveToken(userId: string) {
    try {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        console.log("📢 알림 토큰 발급 완료:", token);
        const { error } = await supabase
          .from('users')
          .update({ push_token: token })
          .eq('id', userId);
  
        if (error) console.error("❌ 토큰 저장 실패:", error);
      }
    } catch (e) {
      console.error("토큰 등록 에러:", e);
    }
  }
  
  async function registerForPushNotificationsAsync() {
    if (Platform.OS === 'web') return; 
  
    let token;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: '기본 알림',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
  
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;
  
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    try {
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch (e) {
      console.error("토큰 발급 실패:", e);
    }
  
    return token;
  }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff7ed' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff7ed' },
  contentContainer: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },

  // 로고 섹션
  logoSection: { alignItems: 'center', marginBottom: 50 },
  logoText: { fontSize: 48, fontWeight: '900', color: '#ea580c', marginBottom: 8 },
  subText: { fontSize: 16, color: '#6b7280' },

  // 역할 선택 섹션
  roleContainer: { width: '100%', gap: 16 },
  questionText: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginBottom: 8, textAlign: 'center' },
  
  roleCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
    padding: 20, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3
  },
  iconCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  textGroup: { flex: 1 },
  roleTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  roleDesc: { fontSize: 14, color: '#6b7280' },

  // 로그인 방식 선택 섹션
  backButton: { position: 'absolute', top: 60, left: 24, zIndex: 10 },
  headerSection: { marginBottom: 40 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#1f2937', marginBottom: 8 },
  headerSub: { fontSize: 16, color: '#6b7280' },
  
  buttonSection: { width: '100%' },
  primaryButton: { 
    backgroundColor: '#ea580c', paddingVertical: 16, borderRadius: 12, 
    alignItems: 'center', marginBottom: 10,
    shadowColor: '#ea580c', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
  },
  primaryButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  line: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { marginHorizontal: 10, color: '#9ca3af', fontSize: 14 },

  socialButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 12, marginBottom: 12, width: '100%',
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2
  },
  socialButtonText: { fontSize: 16, fontWeight: 'bold' },
});