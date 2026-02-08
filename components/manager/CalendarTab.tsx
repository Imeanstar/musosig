/**
 * CalendarTab.tsx
 * - 🚨 [수정됨] UTC -> KST(한국시간) 변환 로직 추가
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { X, Camera, CheckCircle, XCircle } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { Member } from '../../types';

// 달력 한글 설정 (그대로 유지)
LocaleConfig.locales['ko'] = {
  monthNames: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  monthNamesShort: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  dayNames: ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'],
  dayNamesShort: ['일','월','화','수','목','금','토'],
  today: '오늘'
};
LocaleConfig.defaultLocale = 'ko';

interface CalendarTabProps {
  member: Member; 
}

export function CalendarTab({ member }: CalendarTabProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // 🗓️ [수정됨] 기기 설정 무시하고 무조건 한국 시간(KST)으로 계산하는 함수
  const getKSTDateString = (isoString: string) => {
    if (!isoString) return "";
    
    const date = new Date(isoString);
    
    // 1. UTC 기준(밀리초)으로 9시간을 더해서 새로운 시간을 만듭니다.
    // (예: 5일 밤 10시 -> 6일 아침 7시로 시간 자체를 이동)
    const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));

    // 2. 이동된 시간에서 UTC 날짜를 뽑아냅니다.
    // (이미 9시간을 더했으므로 getUTC...를 써야 한국 날짜가 나옵니다)
    const year = kstDate.getUTCFullYear();
    const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(kstDate.getUTCDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };

  const fetchLogs = async () => {
    console.log("🟢 1. fetchLogs 함수 시작됨!"); // 1번 로그
    setIsLoading(true);
    try {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      const { data, error } = await supabase
        .from('check_in_logs')
        .select('*')
        .eq('member_id', member.id)
        .gte('created_at', threeMonthsAgo.toISOString());

      if (error) {
        console.error("🔴 DB 에러 발생:", error); // 에러 로그
        throw error;
      }

      console.log("🟡 2. DB 응답 받음. 데이터 개수:", data?.length); // 2번 로그

      if (data && data.length > 0) {
        setLogs(data);
        processMarkedDates(data); // 데이터가 있어야만 실행됨
      } else {
        console.log("⚪️ 데이터가 0개라서 점 찍기 함수 실행 안 함");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // 🚨 [수정] 달력에 점 찍기 (KST 기준)
  const processMarkedDates = (data: any[]) => {
    console.log("🔵 3. 점 찍기 함수(processMarkedDates) 진입!"); // 3번 로그
    const marks: any = {};
    
    data.forEach((log, index) => {
      const convertedDate = getKSTDateString(log.created_at);
      
      // 첫 번째 데이터만 샘플로 로그 출력
      if (index === 0) {
        console.log(`[샘플] 원본: ${log.created_at} -> 변환: ${convertedDate}`);
      }

      marks[convertedDate] = {
        selected: true,
        selectedColor: '#10b981', 
        dotColor: 'white',
      };
    });
    setMarkedDates(marks);
  };

  useEffect(() => {
    fetchLogs();
  }, [member]);

  // 🚨 [수정] 날짜 클릭 핸들러 (KST 기준 비교)
  const onDayPress = (day: any) => {
    const clickedDateStr = day.dateString; // 사용자가 누른 날짜 (예: 2026-02-06)
    setSelectedDate(clickedDateStr);

    // 로그 찾을 때도 한국 시간으로 변환해서 비교해야 함
    // (기존 startsWith는 UTC 문자열이랑 비교해서 못 찾음)
    const log = logs.find(l => getKSTDateString(l.created_at) === clickedDateStr);
    
    if (log) {
      setSelectedLog(log);
    } else {
      setSelectedLog(null);
    }
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>{member.name}님의 활동 기록!</Text>
      <Text style={styles.headerSub}>최근 3개월간의 기록만 보관됩니다.</Text>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : (
        <Calendar
          theme={{
            todayTextColor: '#3b82f6',
            arrowColor: '#3b82f6',
            selectedDayBackgroundColor: '#10b981',
            textDayFontWeight: '600',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: 'bold',
          }}
          markedDates={markedDates}
          onDayPress={onDayPress}
          monthFormat={'yyyy년 MM월'}
        />
      )}

      {/* ================= 상세 모달 ================= */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            
            <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>

            <Text style={styles.modalDate}>{selectedDate}</Text>

            {selectedLog ? (
              <View style={styles.resultContainer}>
                <CheckCircle size={48} color="#10b981" style={{ marginBottom: 12 }} />
                <Text style={styles.resultTitle}>출석 완료!</Text>
                <Text style={styles.resultDesc}>
                  {selectedLog.check_in_type || '터치'}로 출석한 날입니다.
                </Text>
                <Text style={styles.resultTime}>
                  {/* 시간 표시는 원래 기기 설정 따라가서 잘 나옴 */}
                  ⏰ {new Date(selectedLog.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </Text>

                {selectedLog.proof_url && (
                  <View style={styles.photoBox}>
                    <Text style={styles.photoLabel}>📸 인증 사진</Text>
                    <Image 
                      source={{ uri: selectedLog.proof_url }} 
                      style={styles.photo} 
                      resizeMode="cover" 
                    />
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.resultContainer}>
                <XCircle size={48} color="#ef4444" style={{ marginBottom: 12 }} />
                <Text style={[styles.resultTitle, { color: '#ef4444' }]}>미출석</Text>
                <Text style={styles.resultDesc}>출석하지 않은 날입니다.</Text>
                <Text style={styles.hintText}>
                  전화나 문자로 안부를 물어보세요! 📞
                </Text>
              </View>
            )}
            
            <TouchableOpacity 
              style={[styles.confirmBtn, { backgroundColor: selectedLog ? '#10b981' : '#ef4444' }]} 
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.confirmBtnText}>확인</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white', padding: 20 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  headerSub: { fontSize: 13, color: '#9ca3af', marginBottom: 20 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: '85%', backgroundColor: 'white', borderRadius: 24, padding: 24, alignItems: 'center', elevation: 5 },
  closeBtn: { position: 'absolute', top: 16, right: 16, padding: 4 },
  
  modalDate: { fontSize: 18, fontWeight: 'bold', color: '#4b5563', marginBottom: 20, marginTop: 10 },
  resultContainer: { alignItems: 'center', width: '100%' },
  resultTitle: { fontSize: 24, fontWeight: 'bold', color: '#10b981', marginBottom: 8 },
  resultDesc: { fontSize: 16, color: '#374151', marginBottom: 4 },
  resultTime: { fontSize: 14, color: '#9ca3af', marginBottom: 16 },
  hintText: { fontSize: 14, color: '#6b7280', marginTop: 8 },

  photoBox: { width: '100%', marginTop: 12, alignItems: 'center' },
  photoLabel: { fontSize: 14, fontWeight: '600', color: '#4b5563', marginBottom: 8, alignSelf: 'flex-start' },
  photo: { width: '100%', height: 200, borderRadius: 12, backgroundColor: '#f3f4f6' },

  confirmBtn: { width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  confirmBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});