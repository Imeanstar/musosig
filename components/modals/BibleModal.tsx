/**
 * components/modals/BibleModal.tsx
 * - 📖 성경 말씀 랜덤 출력 모달
 * - 배경 클릭 시 닫히지 않음 (강제 확인)
 */
import React, { useEffect, useState } from 'react';
import { 
  Modal, View, Text, StyleSheet, TouchableOpacity, 
  ActivityIndicator, Dimensions, ImageBackground 
} from 'react-native';
import { BookOpen, Check } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

interface BibleModalProps {
  visible: boolean;
  onConfirm: () => void; // 확인 누르면 체크인 완료
}

const { width } = Dimensions.get('window');

export function BibleModal({ visible, onConfirm }: BibleModalProps) {
  const [verse, setVerse] = useState<{ content: string, reference: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 모달이 켜질 때마다 랜덤 말씀 가져오기
  useEffect(() => {
    if (visible) {
      fetchRandomVerse();
    }
  }, [visible]);

  const fetchRandomVerse = async () => {
    setIsLoading(true);
    try {
      // 1. 전체 개수 확인 (count)
      const { count, error: countError } = await supabase
        .from('bible_verses')
        .select('*', { count: 'exact', head: true });

      if (countError || count === null) throw countError;

      // 2. 랜덤 인덱스 생성
      const randomIndex = Math.floor(Math.random() * count);

      // 3. 해당 인덱스의 말씀 1개 가져오기
      const { data, error } = await supabase
        .from('bible_verses')
        .select('content, reference')
        .range(randomIndex, randomIndex) // 딱 한 줄만
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setVerse(data);
      } else {
        // 혹시 데이터가 없으면 기본값
        setVerse({ content: '항상 기뻐하라 쉬지 말고 기도하라 범사에 감사하라', reference: '데살로니가전서 5:16-18' });
      }

    } catch (e) {
      console.error('성경 로딩 실패:', e);
      // 에러 시 기본 말씀
      setVerse({ content: '사랑은 오래 참고 사랑은 온유하며...', reference: '고린도전서 13:4' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      {/* 배경 눌러도 닫히지 않게 onPress 없음 */}
      <View style={styles.overlay}>
        <View style={styles.card}>
          
          <View style={styles.iconCircle}>
            <BookOpen size={32} color="#fff" />
          </View>

          <Text style={styles.title}>오늘의 말씀</Text>

          <View style={styles.verseContainer}>
            {isLoading ? (
              <ActivityIndicator color="#ca8a04" size="large" />
            ) : (
              <>
                <Text style={styles.content}>
                  "{verse?.content}"
                </Text>
                <Text style={styles.reference}>
                  - {verse?.reference} -
                </Text>
              </>
            )}
          </View>

          <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
            <Text style={styles.btnText}>아멘 (안부 전송)</Text>
            <Check size={20} color="white" style={{ marginLeft: 8 }} />
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', 
    justifyContent: 'center', alignItems: 'center' 
  },
  card: { 
    width: width * 0.85, backgroundColor: '#fffbeb', // 연한 베이지색 배경
    borderRadius: 20, padding: 24, alignItems: 'center',
    elevation: 5 
  },
  iconCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#d97706', // 진한 호박색
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    elevation: 5
  },
  title: {
    fontSize: 22, fontWeight: 'bold', color: '#92400e', marginBottom: 20
  },
  verseContainer: {
    minHeight: 120, justifyContent: 'center', alignItems: 'center',
    marginBottom: 24, paddingHorizontal: 10
  },
  content: {
    fontSize: 18, color: '#451a03', textAlign: 'center', lineHeight: 28,
    fontStyle: 'italic', fontWeight: '500', marginBottom: 12
  },
  reference: {
    fontSize: 14, color: '#b45309', fontWeight: 'bold'
  },
  confirmBtn: {
    backgroundColor: '#d97706', paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: 30, flexDirection: 'row', alignItems: 'center',
    elevation: 3
  },
  btnText: {
    color: 'white', fontSize: 18, fontWeight: 'bold'
  }
});