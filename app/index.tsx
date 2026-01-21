import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Alert, StyleSheet, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useUserManagement } from '../hooks/useUserManagement';
import { clearAllStorage } from '../utils/storage'; // 👈 [추가] 로그아웃 시 저장소 비우기 위해 필요

// 🧩 컴포넌트 불러오기
import { RoleSelection } from '../components/RoleSelection';
import { MemberPairing } from '../components/MemberPairing';
import { MemberMain } from '../components/MemberMain';
import { ManagerMain } from '../components/ManagerMain';
import { RegisterModal } from '../components/modals/RegisterModal'; 

// 👇 알림 관련
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// 1. 알림 핸들러
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function Index() {
  const { userInfo, setUserInfo, isLoading, setIsLoading, loadUser, registerOrLogin } = useUserManagement();
  
  // 화면 상태 관리 ('selection' | 'member_pairing' | 'manager_login')
  const [currentView, setCurrentView] = useState<'selection' | 'member_pairing' | 'manager_login'>('selection');

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

  // 🚪 [핵심 수정] 로그아웃 핸들러 함수 정의
  const handleLogout = async () => {
    Alert.alert("로그아웃", "정말 로그아웃 하시겠습니까?", [
      { text: "취소", style: "cancel" },
      { 
        text: "로그아웃", 
        style: "destructive",
        onPress: async () => {
          try {
            // 1. Supabase 로그아웃
            await supabase.auth.signOut();
            
            // 2. 로컬 기기 저장소 초기화 (utils/storage.ts)
            await clearAllStorage();
            
            // 3. 화면 상태를 '선택 화면'으로 강제 리셋 (이게 없으면 로그인 모달이 뜸)
            setCurrentView('selection'); 
            
            // 4. 유저 상태 비우기 -> 화면 전환 발생
            setUserInfo(null);
            
          } catch (e) {
            console.error("로그아웃 실패:", e);
            Alert.alert("오류", "로그아웃 중 문제가 발생했습니다.");
          }
        } 
      }
    ]);
  };

  // 🔄 로딩 중
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#ea580c" />
      </View>
    );
  }

  // ✅ [상태 1] 이미 로그인이 되어 있는 경우 (메인 화면으로)
  if (userInfo) {
    // A. 멤버라면 -> MemberMain (안부 전하기)
    if (userInfo.role === 'member') {
      // 멤버도 로그아웃이 필요할 수 있으니 핸들러 연결
      return <MemberMain onBack={handleLogout} />; 
    }
    
    // B. 매니저라면 -> ManagerMain (멤버 관리)
    // 🔥 [적용 완료] 여기서 handleLogout을 전달합니다.
    return (
      <ManagerMain 
        userInfo={userInfo} 
        onBack={handleLogout} 
      />
    );
  }

  // ❌ [상태 2] 로그인이 안 된 경우 (화면 분기)

  // 2-1. 멤버: 코드 입력 화면
  if (currentView === 'member_pairing') {
    return (
      <MemberPairing
        onBack={() => setCurrentView('selection')} 
        onPairingComplete={async (managerName) => {
          console.log("👉 [Debug] 페어링 완료 콜백 실행됨!");
          
          setIsLoading(true); 
          try {
            // 1. 현재 세션이 진짜 있는지 확인
            const { data: { session } } = await supabase.auth.getSession();
            console.log("👉 [Debug] 현재 세션 상태:", session ? "로그인됨" : "세션 없음(NULL)");
            
            if (session) console.log("👉 [Debug] User ID:", session.user.id);

            // 2. 유저 정보 로드 시도
            console.log("👉 [Debug] loadUser() 호출 시작");
            await loadUser(); 
            console.log("👉 [Debug] loadUser() 호출 끝");
            
            // 3. userInfo가 업데이트 됐는지 확인 (주의: 상태 업데이트는 즉시 반영 안 될 수 있음)
            // 여기서는 loadUser 내부 동작이 중요함
            
          } catch (e) {
            console.error("❌ [Debug] 에러 발생:", e);
            Alert.alert('오류', '로그인 정보를 갱신하지 못했습니다.');
          } finally {
            setIsLoading(false);
          }
        }}
      />
    );
  }

  // 2-2. 매니저: 로그인/가입 화면
  if (currentView === 'manager_login') {
    return (
      <RegisterModal
        visible={true} 
        onRegister={async (name, phone) => {
          // 매니저로 가입/로그인 시도
          const success = await registerOrLogin(name, phone); 
          if (success) return true;
          return false;
        }}
        onClose={() => setCurrentView('selection')} // 닫기 버튼 누르면 선택 화면으로
      />
    );
  }

  // 2-3. 기본 화면: 역할 선택
  return (
    <RoleSelection
      onRoleSelect={(role) => {
        if (role === 'member') {
          setCurrentView('member_pairing');
        } else {
          setCurrentView('manager_login');
        }
      }}
    />
  );
}

// 👇 토큰 발급 로직
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});