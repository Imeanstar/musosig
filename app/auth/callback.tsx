// app/auth/callback.tsx
import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // 이 화면은 인증 후 앱으로 돌아왔을 때 아주 잠시 보여집니다.
    // useUserManagement의 WebBrowser가 이미 토큰을 가로챘을 확률이 높지만,
    // 만약 여기까지 왔다면 안전하게 메인으로 보냅니다.
    const timer = setTimeout(() => {
      router.replace('/');
    }, 500); // 0.5초 뒤 이동

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff7ed' }}>
      <ActivityIndicator size="large" color="#ea580c" />
      <Text style={{ marginTop: 20, color: '#666', fontSize: 16 }}>
        로그인 완료! 잠시만 기다려주세요...
      </Text>
    </View>
  );
}