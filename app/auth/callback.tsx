// app/auth/callback.tsx
import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // 💡 _layout.tsx에서 이미 로그인을 성공시켰습니다.
    // 여기서는 아주 잠시만 숨을 고르고 메인으로 넘겨줍니다.
    console.log("🚀 [Callback] 화면 진입. 메인 이동 대기 중...");
    
    const timer = setTimeout(() => {
      // '/' 경로로 이동하면 index.tsx가 로그인 여부를 판단해서
      // ManagerMain 또는 MemberMain으로 자동으로 보내줍니다.
      router.replace('/'); 
    }, 1000); // 1초 뒤 이동 (세션 저장 시간 확보)

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#ea580c" />
      <Text style={{ marginTop: 20, color: '#666' }}>
        로그인 성공! 이동 중입니다...
      </Text>
    </View>
  );
}