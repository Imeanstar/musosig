/**
 * CalendarTab.tsx
 * - 매니저용 달력 탭
 * - 기능: 월별 출석 현황 확인 (초록/빨강), 클릭 시 상세 모달(사진 포함)
 * - 데이터 보관: 3개월 전 데이터까지만 조회
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { X, Camera, CheckCircle, XCircle } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { Member } from '../../types';

// 달력 한글 설정
LocaleConfig.locales['ko'] = {
  monthNames: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  monthNamesShort: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  dayNames: ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'],
  dayNamesShort: ['일','월','화','수','목','금','토'],
  today: '오늘'
};
LocaleConfig.defaultLocale = 'ko';

interface CalendarTabProps {
  member: Member; // 누구의 달력을 볼지
}

export function CalendarTab({ member }: CalendarTabProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  
  // 모달 상태
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // 🔄 3개월치 로그 불러오기
  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      // 3개월 전 날짜 계산
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      const { data, error } = await supabase
        .from('check_in_logs')
        .select('*')
        .eq('member_id', member.id)
        .gte('created_at', threeMonthsAgo.toISOString()); // 3개월 필터

      if (error) throw error;

      if (data) {
        setLogs(data);
        processMarkedDates(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // 달력에 점 찍기 (초록색)
  const processMarkedDates = (data: any[]) => {
    const marks: any = {};
    data.forEach(log => {
      const dateKey = log.created_at.split('T')[0]; // YYYY-MM-DD
      marks[dateKey] = {
        selected: true,
        selectedColor: '#10b981', // 초록색 (출석)
        dotColor: 'white',
      };
    });
    setMarkedDates(marks);
  };

  useEffect(() => {
    fetchLogs();
  }, [member]);

  // 📅 날짜 클릭 핸들러
  const onDayPress = (day: any) => {
    const dateStr = day.dateString;
    setSelectedDate(dateStr);

    // 해당 날짜에 로그가 있는지 찾기
    const log = logs.find(l => l.created_at.startsWith(dateStr));
    
    if (log) {
      // 출석함 (초록)
      setSelectedLog(log);
    } else {
      // 출석 안 함 (빨강)
      setSelectedLog(null);
    }
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>{member.name}님의 활동 기록</Text>
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
            
            {/* 닫기 버튼 */}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>

            <Text style={styles.modalDate}>{selectedDate}</Text>

            {selectedLog ? (
              // ✅ 출석한 날 (Green Case)
              <View style={styles.resultContainer}>
                <CheckCircle size={48} color="#10b981" style={{ marginBottom: 12 }} />
                <Text style={styles.resultTitle}>출석 완료!</Text>
                <Text style={styles.resultDesc}>
                  {selectedLog.check_in_type || '터치'}로 출석한 날입니다.
                </Text>
                <Text style={styles.resultTime}>
                  ⏰ {new Date(selectedLog.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </Text>

                {/* 사진이 있으면 보여주기 */}
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
              // ❌ 결석한 날 (Red Case)
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
  
  // 모달 스타일
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