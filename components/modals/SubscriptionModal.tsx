import React, { useState } from 'react';
import { 
  Modal, View, Text, StyleSheet, TouchableOpacity, 
  Alert, ActivityIndicator, ScrollView 
} from 'react-native';
import { X, Check, Crown } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface SubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SubscriptionModal({ visible, onClose }: SubscriptionModalProps) {
  const [isPurchasing, setIsPurchasing] = useState(false);

  // 🔥 [가짜 결제 함수] 실제 결제창 대신 로딩 후 성공 처리
  const handleMockPurchase = async () => {
    setIsPurchasing(true);
    
    // 1. 결제하는 척 1.5초 대기 (사용자에겐 진짜처럼 보임)
    setTimeout(async () => {
      try {
        await activatePremium(); // DB 업데이트 실행
      } catch (e) {
        Alert.alert("오류", "결제 처리에 실패했습니다.");
      } finally {
        setIsPurchasing(false);
      }
    }, 1500);
  };

  // DB에 프리미엄 상태 저장 (진짜 로직)
  const activatePremium = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('users')
        .update({ is_premium: true })
        .eq('id', user.id);

      if (error) throw error;

      Alert.alert("환영합니다! 👑", "프리미엄 멤버십이 활성화되었습니다.\n(베타 기간 무료 체험 적용)", [
        { text: "확인", onPress: onClose }
      ]);
      
    } catch (e) {
      console.error(e);
      Alert.alert("오류", "등급 적용에 실패했습니다. 다시 시도해주세요.");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>프리미엄 멤버십</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.heroSection}>
            <Crown size={64} color="#fbbf24" fill="#fbbf24" style={styles.crownIcon} />
            <Text style={styles.heroTitle}>가족의 안전,{'\n'}더 확실하게 지키세요</Text>
            <Text style={styles.heroDesc}>
              지금 베타 테스터로 참여하고{'\n'}무료 혜택을 받아보세요!
            </Text>
          </View>

          {/* 혜택 리스트 */}
          <View style={styles.benefitsContainer}>
            <BenefitItem text="등록 가능한 가족 수 증가 (기본 3명)" />
            <BenefitItem text="배터리 방전 직전 위치/알림 전송" />
            <BenefitItem text="과거 출석 기록 1년 보관 (기본 3개월)" />
            <BenefitItem text="광고 없는 쾌적한 환경" />
          </View>

          <View style={{ height: 30 }} />

          {/* 구매 버튼 영역 */}
          <TouchableOpacity
            style={styles.purchaseBtn}
            onPress={handleMockPurchase}
            disabled={isPurchasing}
          >
            {isPurchasing ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={styles.btnTitle}>베타 기간 한정 혜택</Text>
                <Text style={styles.btnPrice}>0원</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.footerNote}>
            * 정식 출시 전까지 모든 기능을 무료로 이용하실 수 있습니다.
          </Text>

        </ScrollView>
      </View>
    </Modal>
  );
}

// 혜택 아이템 컴포넌트
function BenefitItem({ text }: { text: string }) {
  return (
    <View style={styles.benefitRow}>
      <View style={styles.checkCircle}>
        <Check size={14} color="white" strokeWidth={3} />
      </View>
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  headerTitle: { fontSize: 16, fontWeight: 'bold' },
  content: { padding: 24, paddingBottom: 50 },
  heroSection: { alignItems: 'center', marginBottom: 40, marginTop: 20 },
  crownIcon: { marginBottom: 16, shadowColor: '#fbbf24', shadowRadius: 10, shadowOpacity: 0.5 },
  heroTitle: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', color: '#1f2937', marginBottom: 12 },
  heroDesc: { fontSize: 16, color: '#6b7280', textAlign: 'center', lineHeight: 24 },
  benefitsContainer: { backgroundColor: '#f9fafb', borderRadius: 16, padding: 24 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  checkCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  benefitText: { fontSize: 15, color: '#374151', fontWeight: '500', flex: 1 },
  purchaseBtn: { backgroundColor: '#2563eb', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginBottom: 16, shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  btnTitle: { color: 'white', fontSize: 14, fontWeight: '600', opacity: 0.9, marginBottom: 4 },
  btnPrice: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  footerNote: { textAlign: 'center', color: '#9ca3af', fontSize: 13 },
});