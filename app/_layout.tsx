// app/_layout.tsx
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { Stack, useRouter } from "expo-router";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Linking } from 'react-native'; 
import { supabase } from '../lib/supabase';
import { UserProvider } from '@/contexts/UserContext'; // 👈 import 확인

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    // 🕵️‍♂️ URL 처리기 (딥링크 로직 유지)
    const handleDeepLink = async (url: string | null) => {
      if (!url) return;

      // ... (기존 딥링크 파싱 로직 그대로 유지) ...
      // 토큰 파싱 로직
      if (url.includes('access_token') || url.includes('refresh_token')) {
        const fragment = url.includes('#') ? url.split('#')[1] : url.split('?')[1];
        if (!fragment) return;

        const params: { [key: string]: string } = {};
        fragment.split('&').forEach(part => {
          const [key, value] = part.split('=');
          if (key && value) params[key] = decodeURIComponent(value);
        });

        if (params.access_token && params.refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });

          if (!error) {
            // Alert.alert("로그인 성공", "환영합니다!"); // (선택) 너무 자주 뜨면 주석 처리
            router.replace('/'); 
          } else {
            Alert.alert("로그인 에러", error.message);
          }
        }
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* 👇 여기에 UserProvider를 씌워주세요! */}
      <UserProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="auth/callback" options={{ presentation: 'modal' }} />
          <Stack.Screen name="auth/certification" />
        </Stack>
      </UserProvider>
    </GestureHandlerRootView>
  );
}