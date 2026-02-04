// app/_layout.tsx
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { Stack, useRouter } from "expo-router";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Linking } from 'react-native'; // 👈 반드시 react-native 내장 모듈 사용
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    // 🕵️‍♂️ URL 처리기 (어디로 들어오든 여기서 다 잡습니다)
    const handleDeepLink = async (url: string | null) => {
      if (!url) return;

      // 🚨 [최종 확인] 친구 폰에서 이 알림이 뜨면 100% 성공입니다.
      Alert.alert("딥링크 수신됨", url);

      // 토큰 파싱 로직
      if (url.includes('access_token') || url.includes('refresh_token')) {
        
        // 해시(#)나 쿼리(?) 뒤의 파라미터 추출
        const fragment = url.includes('#') ? url.split('#')[1] : url.split('?')[1];
        if (!fragment) return;

        const params: { [key: string]: string } = {};
        fragment.split('&').forEach(part => {
          const [key, value] = part.split('=');
          if (key && value) params[key] = decodeURIComponent(value);
        });

        // 세션 생성
        if (params.access_token && params.refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });

          if (!error) {
            Alert.alert("로그인 성공", "환영합니다!");
            // 🚀 callback 페이지로 갈 필요도 없이 바로 홈으로 쏴버립니다.
            router.replace('/'); 
          } else {
            Alert.alert("로그인 에러", error.message);
          }
        }
      }
    };

    // 1. 앱이 꺼져있을 때 (Cold Start)
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // 2. 앱이 켜져있을 때 (Warm Start / Background)
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
        {/* callback 화면은 존재는 하되, 로직은 _layout이 처리합니다 */}
        <Stack.Screen name="auth/callback" options={{ presentation: 'modal' }} /> 
        <Stack.Screen name="auth/certification" />
      </Stack>
    </GestureHandlerRootView>
  );
}