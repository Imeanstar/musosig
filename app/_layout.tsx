// app/_layout.tsx
import { Stack } from "expo-router";

// import "../global.css";  <-- 이 줄이 범인입니다. 지워야 합니다!

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}