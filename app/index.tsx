import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
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
// ✅ [NEW] 권한 확인 컴포넌트 추가
import { PermissionIntro } from '../components/PermissionIntro';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type ViewState = 'role_selection' | 'login_method' | 'auth_manager' | 'member_pairing';

export default function Index() {
  const { 
    userInfo, isLoading, loadUser, performOAuth, resetAllData 
  } = useUserManagement();
  
  const [currentView, setCurrentView] = useState<ViewState>('role_selection');
  
  // ✅ [NEW] 권한 체크 완료 여부 (기본값 false -> 아직 확인 안 함)
  const [isPermissionChecked, setIsPermissionChecked] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  // 2. 로그인 성공 시 알림 토큰 저장
  useEffect(() => {
    if (userInfo?.id) {
      registerAndSaveToken(userInfo.id);
    }
  }, [userInfo]);

  const handleLogout = async () => {
    try {
      await resetAllData();
      setCurrentView('role_selection'); // 첫 화면으로 리셋
    } catch (e) {
      console.error("로그아웃 실패:", e);
    }
  };

  // ✅ [NEW] 1. 앱 켜자마자 권한 체크 화면 먼저 보여주기
  // (PermissionIntro 내부에서 이미 허용되어 있으면 자동으로 onAllGranted를 호출해 통과함)
  if (!isPermissionChecked) {
    return (
      <PermissionIntro 
        onAllGranted={() => setIsPermissionChecked(true)} 
      />
    );
  }

  // 🔄 2. 로딩 중
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ea580c" />
        <Text style={{ marginTop: 10, color: '#666' }}>로딩 중...</Text>
      </View>
    );
  }

  // ✅ 3. 로그인되어 있는데 전화번호가 없는 경우 (소셜 가입 마무리)
  if (userInfo && !userInfo.phone) {
    return (
      <AuthManager 
        onBack={handleLogout} 
        initialMode="social_finish" 
        socialUser={userInfo} 
        onSuccess={() => loadUser()} 
      />
    );
  }
  
  // ✅ 4. 메인 화면 진입 (로그인 완료 상태)
  if (userInfo) {
    if (userInfo.role === 'member') {
      return <MemberMain onBack={handleLogout} userInfo={userInfo!} />; 
    }
    return <ManagerMain userInfo={userInfo!} onBack={handleLogout} />;
  }

  // ---------------------------------------------------------
  // 👇 여기서부터는 로그인 전 화면 (Role Selection 등)
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
            <TouchableOpacity 
              style={styles.roleCard} 
              activeOpacity={0.8}
              onPress={() => setCurrentView('login_method')} 
            >
              <View style={[styles.iconCircle, { backgroundColor: '#eff6ff' }]}>
                 <Ionicons name="shield-checkmark" size={32} color="#3b82f6" />
              </View>
              <View style={styles.textGroup}>
                <Text style={styles.roleTitle}>안부 묻기</Text>
                <Text style={styles.roleDesc}>잘 지내는지 궁금해요</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#cbd5e1" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.roleCard} 
              activeOpacity={0.8}
              onPress={() => setCurrentView('member_pairing')} 
            >
              <View style={[styles.iconCircle, { backgroundColor: '#fff7ed' }]}>
                 <Ionicons name="heart" size={32} color="#ea580c" />
              </View>
              <View style={styles.textGroup}>
                <Text style={styles.roleTitle}>안부 답하기</Text>
                <Text style={styles.roleDesc}>잘 지낸다고 알릴래요</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#cbd5e1" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

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
            <TouchableOpacity 
              style={[styles.socialButton, { backgroundColor: '#FEE500' }]} 
              onPress={() => performOAuth('kakao')}
            >
              <FontAwesome name="comment" size={20} color="#3C1E1E" style={{ marginRight: 10 }} />
              <Text style={[styles.socialButtonText, { color: '#3C1E1E' }]}>카카오로 시작하기</Text>
            </TouchableOpacity>
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

  if (currentView === 'auth_manager') {
    return (
      <AuthManager 
        onBack={() => setCurrentView('login_method')} 
        onSuccess={() => loadUser()}
      />
    );
  }

  if (currentView === 'member_pairing') {
    return (
      <MemberPairing
        onBack={() => setCurrentView('role_selection')} 
        onPairingComplete={async () => {
          await loadUser(); 
        }}
      />
    );
  }

  return null;
}

// ---------------------------------------------------------
// Helper Functions (알림 토큰)
// ---------------------------------------------------------

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
  logoSection: { alignItems: 'center', marginBottom: 50 },
  logoText: { fontSize: 48, fontWeight: '900', color: '#ea580c', marginBottom: 8 },
  subText: { fontSize: 16, color: '#6b7280' },
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