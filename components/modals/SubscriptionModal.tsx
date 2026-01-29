import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { X, Crown, ShieldAlert, BatteryCharging, Clock, Smartphone } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // 👈 안전 영역 계산용
import { useUserManagement } from '../../hooks/useUserManagement';
import { usePremium } from '../../hooks/usePremium';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function SubscriptionModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets(); // 👈 상단/하단 여백 계산
  const { userInfo, setUserInfo } = useUserManagement();
  const { upgradeToPremium, isProcessing } = usePremium(userInfo, setUserInfo);

  const handlePayment = async () => {
    Alert.alert(
      "결제 테스트 모드 💳",
      "실제 결제가 발생하지 않습니다.\n프리미엄 기능을 활성화하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        { 
          text: "결제 성공 (시뮬레이션)", 
          onPress: async () => {
             const success = await upgradeToPremium();
             if (success) onClose();
          }
        }
      ]
    );
  };

  const features = [
    { icon: ShieldAlert, title: "데드맨 스위치", desc: "24시간 폰 미사용 시 자동 구조 요청" },
    { icon: Clock, title: "골든타임 타이머", desc: "위험 구간 진입 전 타이머 설정" },
    { icon: BatteryCharging, title: "배터리 방전 알림", desc: "꺼지기 직전 마지막 위치 전송" },
    { icon: Smartphone, title: "페이크 콜", desc: "밤길 치한 퇴치용 가짜 전화" },
    { icon: Crown, title: "멤버 무제한 & 기록 전체 조회", desc: "가족/친구 모두 등록 가능" },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        
        {/* 1. 상단 바 (Top Bar) - 고정 영역 */}
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>멤버십 업그레이드</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* 2. 스크롤 영역 (중간) - 남는 공간 다 차지 (Flex: 1) */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <LinearGradient
              colors={['#f59e0b', '#d97706']}
              style={styles.iconCircle}
            >
              <Crown size={40} color="white" fill="white" />
            </LinearGradient>
            <Text style={styles.title}>무소식 프리미엄</Text>
            <Text style={styles.subtitle}>나와 소중한 사람을 위한{'\n'}완벽한 안전 장치</Text>
          </View>

          {/* 혜택 리스트 */}
          <View style={styles.featuresContainer}>
            {features.map((item, index) => (
              <View key={index} style={styles.featureRow}>
                <View style={styles.featureIconBox}>
                  <item.icon size={24} color="#d97706" />
                </View>
                <View style={styles.featureTextBox}>
                  <Text style={styles.featureTitle}>{item.title}</Text>
                  <Text style={styles.featureDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* 가격 정책 박스 */}
          <View style={styles.priceBox}>
            <View style={styles.priceRow}>
              <Text style={styles.planName}>월간 구독</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.originalPrice}>₩6,900</Text>
                <Text style={styles.finalPrice}>₩4,900 <Text style={styles.perMonth}>/월</Text></Text>
              </View>
            </View>
            <Text style={styles.promoText}>☕ 커피 한 잔 값으로 24시간 안전을 지키세요.</Text>
          </View>
        </ScrollView>

        {/* 3. 하단 바 (Footer) - 고정 영역 */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.subscribeBtn} 
            onPress={handlePayment}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.btnText}>30일 무료 체험 후 시작하기</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.termsText}>언제든 해지 가능합니다.</Text>
        </View>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  
  // 1. 상단 바 스타일
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // 타이틀과 X버튼 양끝 정렬
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#fff',
  },
  topBarTitle: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  closeBtn: { padding: 4 },

  // 2. 스크롤 영역 스타일
  scrollContent: { padding: 24, paddingBottom: 40 }, // 하단 여백 조금만 줘도 됨 (Footer가 안 가리니까)
  
  header: { alignItems: 'center', marginTop: 20, marginBottom: 40 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20, elevation: 10 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1f2937', marginBottom: 10 },
  subtitle: { fontSize: 18, color: '#6b7280', textAlign: 'center', lineHeight: 26 },

  featuresContainer: { marginBottom: 40 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  featureIconBox: { width: 50, height: 50, borderRadius: 16, backgroundColor: '#fff7ed', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  featureTextBox: { flex: 1 },
  featureTitle: { fontSize: 18, fontWeight: 'bold', color: '#374151', marginBottom: 4 },
  featureDesc: { fontSize: 14, color: '#9ca3af' },

  priceBox: { backgroundColor: '#f9fafb', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#e5e7eb' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  planName: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  originalPrice: { textDecorationLine: 'line-through', color: '#9ca3af', fontSize: 16 },
  finalPrice: { fontSize: 24, fontWeight: 'bold', color: '#d97706' },
  perMonth: { fontSize: 14, color: '#6b7280', fontWeight: 'normal' },
  promoText: { color: '#6b7280', fontSize: 14 },

  // 3. 하단 바 스타일 (Absolute 제거함!)
  footer: { 
    padding: 24, 
    backgroundColor: 'white', 
    borderTopWidth: 1, 
    borderTopColor: '#f3f4f6' 
  },
  subscribeBtn: { backgroundColor: '#ea580c', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#ea580c', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  btnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  termsText: { textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 12 }
});