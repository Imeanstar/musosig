import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LogOut, Heart } from 'lucide-react-native';
// 👇 [에러 해결 1] 이 줄이 꼭 있어야 'supabase' 에러가 안 납니다!
import { supabase } from '@/lib/supabase';
import { useUserManagement } from '../hooks/useUserManagement';

interface MemberMainProps {
  onBack: () => void;
}

export function MemberMain({ onBack }: MemberMainProps) {
  const { userInfo } = useUserManagement();
  const [hasCheckedIn, setHasCheckedIn] = useState(false); // 오늘 안부 전했는지 여부
  
  // 👇 [에러 해결 2] 이 줄이 꼭 있어야 'setIsLoading' 에러가 안 납니다!
  const [isLoading, setIsLoading] = useState(false);
  
  const [todayDate, setTodayDate] = useState('');

  // 1. 앱 켜면 오늘 이미 안부를 전했는지 확인
  useEffect(() => {
    checkTodayStatus();
    
    // 날짜 표시용
    const now = new Date();
    setTodayDate(`${now.getMonth() + 1}월 ${now.getDate()}일`);
  }, []);

  const checkTodayStatus = async () => {
    if (!userInfo) return;
    try {
      // 한국 시간 기준 날짜 확인을 위해 로컬 시간 활용
      const today = new Date();
      
      // check_in_logs에서 오늘 날짜 기록이 있는지 확인
      // (여기서는 간단하게 created_at 기준으로 조회)
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();

      const { data } = await supabase
        .from('check_in_logs')
        .select('id')
        .eq('member_id', userInfo.id)
        .gte('created_at', startOfDay) // 오늘 0시 이후 기록
        .limit(1);

      if (data && data.length > 0) {
        setHasCheckedIn(true);
      }
    } catch (e) {
      console.error('상태 확인 실패:', e);
    }
  };

  // 🔥 2. 안부 전하기 버튼 클릭 시 실행되는 함수
  const handleCheckIn = async () => {
    if (!userInfo) return;
    setIsLoading(true);

    try {
      const now = new Date().toISOString(); 

      // 1️⃣ [실시간용] users 테이블의 last_seen_at 업데이트 (알림 서버용)
      const { error: userError } = await supabase
        .from('users')
        .update({ last_seen_at: now })
        .eq('id', userInfo.id);

      if (userError) throw userError;

      // 2️⃣ [달력용] check_in_logs에 기록 추가 (하루 1번 제한)
      // (이미 오늘 기록이 있으면 DB Unique Index 덕분에 에러가 나거나 무시됨 -> 괜찮음!)
      await supabase
        .from('check_in_logs')
        .insert({
          member_id: userInfo.id,
          // created_at은 DB가 알아서 넣음
        })
        .select(); 

      // 성공 처리
      setHasCheckedIn(true);
      Alert.alert("성공", "보호자에게 안부를 전했습니다! 😊");

    } catch (e: any) {
      console.error(e);
      // 인덱스 중복 에러(이미 오늘 찍음)는 성공으로 간주해도 됨
      if (e.message && e.message.includes('unique constraint')) {
         setHasCheckedIn(true);
         Alert.alert("알림", "오늘은 이미 안부를 전하셨어요! 😊");
      } else {
         Alert.alert("오류", "전송에 실패했습니다. 다시 시도해주세요.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>안녕하세요,</Text>
          <Text style={styles.name}>{userInfo?.nickname || userInfo?.name}님!</Text>
        </View>
        <TouchableOpacity onPress={onBack} style={styles.logoutButton}>
          <LogOut color="#6b7280" size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.dateText}>오늘은 {todayDate} 입니다.</Text>

        {/* 메인 버튼 영역 */}
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
                disabled={hasCheckedIn} // 이미 했으면 클릭 방지
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