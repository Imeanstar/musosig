// app/_layout.tsx
import { useEffect } from 'react';
import { Stack } from "expo-router";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking'; 
import { useDeepLink } from '../hooks/useDeepLink';

export default function RootLayout() {
  
  // 1. 기존 훅 실행
  const { handleDeepLink } = useDeepLink({
    onAuthSuccess: () => console.log("🎉 [Layout] 딥링크 로그인 성공!"),
    onAuthError: (msg: string) => console.log("🚨 [Layout] 딥링크 에러:", msg),
    enableDebugAlerts: true,
  });

  // 2. 강제 URL 확인
  useEffect(() => {
    const checkInitialUrl = async () => {
      const url = await Linking.getInitialURL();
      if (url) {
        console.log("🔍 [Layout] getInitialURL 감지:", url);
        handleDeepLink({ url }); 
      }
    };
    checkInitialUrl();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        {/* 👇 [수정] options={{ href: null }} 제거함 (Stack에서는 불필요) */}
        <Stack.Screen name="auth/callback" /> 
        <Stack.Screen name="auth/certification" />
      </Stack>
    </GestureHandlerRootView>
  );
}