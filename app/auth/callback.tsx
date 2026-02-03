// app/auth/callback.tsx
import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

export default function AuthCallback() {
  // 로직 없음! (모든 처리는 _layout.tsx가 담당)
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#ea580c" />
      <Text style={{ marginTop: 20, color: '#666' }}>
        로그인 확인 중...
      </Text>
    </View>
  );
}