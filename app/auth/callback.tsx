// app/auth/callback.tsx
import { useEffect } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking'; // 여기선 expo-linking 써도 됩니다 (이미 들어왔으니까)
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  useEffect(() => {
    // 이 화면이 켜졌다는 건, URL을 타고 들어왔다는 뜻입니다.
    const handleUrl = async () => {
      // 1. 현재 주소를 가져옵니다.
      const url = await Linking.getInitialURL();
      
      // 🚨 [생존 신고] 친구 폰에서 이 알림이 무조건 뜰 겁니다.
    //   Alert.alert("도착했습니다!", url || "주소 없음");

      if (!url) return;

      // 2. 토큰 파싱 (기존 로직과 동일)
      if (url.includes('access_token')) {
        const fragment = url.split('#')[1] || url.split('?')[1];
        if (fragment) {
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
              // Alert.alert("성공", "로그인 완료! 홈으로 이동합니다.");
              // 세션 설정 후 홈으로 이동
              router.replace('/'); 
              return;
            } else {
              Alert.alert("에러", error.message);
            }
          }
        }
      } 
      
      // 3. 에러 케이스 처리
      if (url.includes('error=')) {
        Alert.alert("로그인 실패", url);
      }
    };

    handleUrl();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
      <ActivityIndicator size="large" color="#0000ff" />
      <Text style={{ marginTop: 20 }}>로그인 처리 중입니다...</Text>
    </View>
  );
}