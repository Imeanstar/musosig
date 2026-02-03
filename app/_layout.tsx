// app/_layout.tsx
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { Stack, useRouter } from "expo-router";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// ❌ expo-linking 대신 react-native의 Linking을 씁니다 (더 강력함)
import { Linking } from 'react-native'; 
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    Alert.alert("버전 확인", "지금 코드는 29번 빌드입니다!");
    // 🕵️‍♂️ URL 처리 함수
    const handleDeepLink = async (event: { url: string }) => {
      let url = event.url;
      if (!url) return;

      console.log("🚀 [Native Linking] 수신:", url);
      // 🚨 알림: 이걸 보면 성공입니다.
      Alert.alert("딥링크 감지 성공!", url); 

      // 1. Supabase 토큰 파싱
      if (url.includes('access_token') && (url.includes('#') || url.includes('?'))) {
        const fragment = url.split('#')[1] || url.split('?')[1];
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
            router.replace('/'); 
            Alert.alert("로그인 성공", "환영합니다!");
          } else {
            Alert.alert("세션 에러", error.message);
          }
        }
      } 
      // 2. 에러 감지
      else if (url.includes('error=')) {
        Alert.alert("로그인 실패", url);
      }
    };

    // A. 앱이 켜져있을 때 (Listener)
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // B. 앱이 꺼져있을 때 (Initial URL)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url: url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth/callback" /> 
        <Stack.Screen name="auth/certification" />
      </Stack>
    </GestureHandlerRootView>
  );
}