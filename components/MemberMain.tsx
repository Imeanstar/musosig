import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LogOut, Heart } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useUserManagement } from '../hooks/useUserManagement';

interface MemberMainProps {
  onBack: () => void;
}

export function MemberMain({ onBack }: MemberMainProps) {
  // 🔥 [수정 1] loadUser 함수도 같이 가져옵니다.
  const { userInfo, loadUser } = useUserManagement();
  
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [todayDate, setTodayDate] = useState('');

  // 1. 앱 켜면 -> 유저 정보 로드 -> 오늘 출석 확인
  useEffect(() => {
    const init = async () => {
      // 🔥 [수정 2] 화면이 켜지면 저장된 유저 정보를 불러옵니다!
      await loadUser(); 
      
      const now = new Date();
      setTodayDate(`${now.getMonth() + 1}월 ${now.getDate()}일`);
    };
    init();
  }, []);

  // userInfo가 로드되면 -> 출석 여부 확인 (자동 실행)
  useEffect(() => {
    if (userInfo) {
      console.log(`[MemberMain] 유저 로드 완료: ${userInfo.name}`);
      checkTodayStatus();
    }
  }, [userInfo]);

  const checkTodayStatus = async () => {
    if (!userInfo) return;
    try {
      const startOfDay = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
      
      const { data } = await supabase
        .from('check_in_logs')
        .select('id')
        .eq('member_id', userInfo.id)
        .gte('created_at', startOfDay)
        .limit(1);

      if (data && data.length > 0) {
        setHasCheckedIn(true);
      }
    } catch (e) {
      console.error('상태 확인 실패:', e);
    }
  };

  const handleCheckIn = async () => {
    if (!userInfo) {
      Alert.alert("오류", "사용자 정보를 불러오는 중입니다. 잠시만 기다려주세요.");
      return;
    }

    setIsLoading(true);

    try {
      const now = new Date().toISOString(); 

      // 1️⃣ [실시간용] users 테이블 업데이트
      const { error: userError } = await supabase
        .from('users')
        .update({ last_seen_at: now })
        .eq('id', userInfo.id);

      if (userError) throw userError;

      // 2️⃣ [달력용] check_in_logs 기록 추가
      await supabase
        .from('check_in_logs')
        .insert({ member_id: userInfo.id });

      setHasCheckedIn(true);
      Alert.alert("성공", "보호자에게 안부를 전했습니다! 😊");

    } catch (e: any) {
      // 중복 에러는 성공으로 간주
      if (e.code === '23505') {
         setHasCheckedIn(true);
         Alert.alert("알림", "오늘은 이미 안부를 전하셨어요! 😊");
      } else {
         console.error(e);
         Alert.alert("오류", "전송에 실패했습니다. 다시 시도해주세요.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 화면 표시 이름 (없으면 '회원'으로 표시)
  const displayName = userInfo?.nickname || userInfo?.name || '회원';

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>안녕하세요,</Text>
          <Text style={styles.name}>{displayName}님!</Text>
        </View>
        <TouchableOpacity onPress={onBack} style={styles.logoutButton}>
          <LogOut color="#6b7280" size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.dateText}>오늘은 {todayDate} 입니다.</Text>

        <View style={styles.card}>
          <LinearGradient
            colors={hasCheckedIn ? ['#10b981', '#059669'] : ['#f97316', '#ea580c']}
            style={styles.gradientCard}
          >
            {isLoading ? (
              <ActivityIndicator size="large" color="white" />
            ) : (
              <TouchableOpacity 
                style={styles.touchArea} 
                onPress={handleCheckIn}
                disabled={hasCheckedIn} 
              >
                <Heart 
                  size={80} 
                  color="white" 
                  fill={hasCheckedIn ? "white" : "transparent"} 
                  style={{ marginBottom: 20 }}
                />
                <Text style={styles.mainButtonText}>
                  {hasCheckedIn ? "오늘 안부를\n전했습니다 완료!" : "터치해서\n안부 전하기"}
                </Text>
              </TouchableOpacity>
            )}
          </LinearGradient>
        </View>
        
        <Text style={styles.infoText}>
          {hasCheckedIn 
            ? "내일 또 소식을 전해주세요!" 
            : "보호자가 걱정하지 않게\n버튼을 꾹 눌러주세요."}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff7ed' },
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20 
  },
  greeting: { fontSize: 18, color: '#4b5563' },
  name: { fontSize: 26, fontWeight: 'bold', color: '#1f2937' },
  logoutButton: { padding: 8, backgroundColor: '#f3f4f6', borderRadius: 50 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  dateText: { fontSize: 20, color: '#6b7280', marginBottom: 30, fontWeight: '600' },
  card: { 
    width: '100%', aspectRatio: 1, maxWidth: 320, borderRadius: 200, 
    elevation: 10, shadowColor: '#f97316', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20,
    overflow: 'hidden', marginBottom: 40
  },
  gradientCard: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  touchArea: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  mainButtonText: { color: 'white', fontSize: 28, fontWeight: 'bold', textAlign: 'center', lineHeight: 40 },
  infoText: { fontSize: 18, color: '#9ca3af', textAlign: 'center', lineHeight: 28 },
});