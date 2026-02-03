// app/_layout.tsx
import { Stack } from "expo-router";
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        {/* 👇 여기가 핵심입니다. URL이 오면 이 화면이 켜집니다. */}
        <Stack.Screen name="auth/callback" options={{ presentation: 'modal' }} /> 
        <Stack.Screen name="auth/certification" />
      </Stack>
    </GestureHandlerRootView>
  );
}