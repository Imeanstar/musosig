// lib/supabase.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import 'react-native-url-polyfill/auto'; // URL 폴리필 (없으면 에러날 수 있음)

// ⚠️ 본인의 Supabase URL과 Anon Key를 넣어주세요
const supabaseUrl = 'https://qeikodkvdzczerweonyb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlaWtvZGt2ZHpjemVyd2VvbnliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxOTIyNTEsImV4cCI6MjA4Mzc2ODI1MX0.GdJ7K3rikBfr-sJuZghn5WSYu_mVdQfQHZj_noGZJs4';


export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // 👇 [핵심] 로그인 정보를 메모리가 아니라 '핸드폰 저장소'에 저장하도록 설정!
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// 👇 [추가] 앱 상태(켜짐/꺼짐)에 따라 세션 갱신을 관리하는 로직
// 앱이 백그라운드에서 포그라운드로 올 때 토큰을 리프레시해줍니다.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});