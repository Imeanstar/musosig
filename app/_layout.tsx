// app/_layout.tsx
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { Stack, useRouter } from "expo-router";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// 👇 순정 Linking 사용 (expo-linking 아님!)
import { Linking } from 'react-native'; 
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    Alert.alert("버전 확인", "지금 코드는 33번 빌드입니다!");
    // 🔍 URL 처리기
    const handleDeepLink = async (url: string | null) => {
      if (!url) return;
      
      console.log("🚀 [Native] URL 감지:", url);
      // 👇 이 Alert이 친구 폰에서 떠야 합니다!
      Alert.alert("디버그: URL 수신됨", url); 

      // 토큰 파싱 로직 (기존과 동일)
      if (url.includes('access_token')) {
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
      } else if (url.includes('error=')) {
        Alert.alert("로그인 실패", url);
      }
    };

    // 1. 앱이 꺼져있을 때 (Cold Start)
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // 2. 앱이 켜져있을 때 (Warm Start)
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        // 👇 callback 화면은 그냥 껍데기로 둡니다
        <Stack.Screen name="auth/callback" options={{ presentation: 'modal' }} /> 
        <Stack.Screen name="auth/certification" />
      </Stack>
    </GestureHandlerRootView>
  );
}