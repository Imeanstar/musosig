// lib/supabase.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Alert, AppState } from 'react-native';
import 'react-native-url-polyfill/auto';
import Constants from 'expo-constants';

// ✅ 보안 강화: 환경 변수에서 키를 가져옵니다
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

console.log("---- Supabase 설정 확인 ----");
console.log("URL:", supabaseUrl); 
console.log("KEY:", supabaseAnonKey ? "키 있음 (보안상 숨김)" : "🚨 키 없음(비어있음!)");
console.log("--------------------------");

// (디버깅용) 만약 URL이 비어있으면 터미널에 경고를 띄웁니다.
if (!supabaseUrl || !supabaseAnonKey) {
  Alert.alert("🚨 Supabase 환경변수가 비어있습니다! .env 파일을 확인해주세요.");
}

// 🔒 개발 모드에서만 경고 표시
if (__DEV__ && (!supabaseUrl || !supabaseAnonKey)) {
  console.error('⚠️ SUPABASE 환경 변수가 설정되지 않았습니다!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
