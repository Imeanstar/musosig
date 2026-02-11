/**
 * components/modals/StoreConfirmModal.tsx
 * - 🛒 상점 전용 구매 확인 모달
 * - Alert 대신 상품 이미지와 상세 정보를 예쁘게 보여줌
 */
import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { X, Check, Coins } from 'lucide-react-native';

interface Product {
  id: number;
  name: string;
  price: number;
  image_url: string;
}

interface StoreConfirmModalProps {
  visible: boolean;
  product: Product | null;
  onClose: () => void;
  onConfirm: () => void;
  isPurchasing: boolean; // 로딩 상태
  myPoints: number;      // 현재 포인트 (계산용)
}

const { width } = Dimensions.get('window');

export function StoreConfirmModal({ 
  visible, product, onClose, onConfirm, isPurchasing, myPoints 
}: StoreConfirmModalProps) {
  if (!product) return null;

  const remainingPoints = myPoints - product.price;
  const isRaffle = product.name.includes('응모권');

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          
          {/* 닫기 버튼 */}
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={24} color="#9ca3af" />
          </TouchableOpacity>

          {/* 상품 이미지 */}
          <Image source={{ uri: product.image_url }} style={styles.image} resizeMode="cover" />

          {/* 상품 정보 */}
          <View style={styles.content}>
            <Text style={styles.subTitle}>선택한 상품</Text>
            <Text style={styles.prodName}>{product.name}</Text>
            
            <View style={styles.divider} />

            {/* 계산서 영역 */}
            <View style={styles.row}>
              <Text style={styles.label}>보유 포인트</Text>
              <Text style={styles.value}>{myPoints.toLocaleString()} P</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.label, {color: '#ef4444'}]}>차감 포인트</Text>
              <Text style={[styles.value, {color: '#ef4444'}]}>- {product.price.toLocaleString()} P</Text>
            </View>
            <View style={[styles.divider, { marginVertical: 8 }]} />
            <View style={styles.row}>
              <Text style={[styles.label, { fontWeight: 'bold', color: '#111827' }]}>구매 후 잔액</Text>
              <Text style={[styles.value, { fontWeight: 'bold', color: '#15803d' }]}>
                {remainingPoints.toLocaleString()} P
              </Text>
            </View>
          </View>

          {/* 하단 버튼 */}
          <TouchableOpacity 
            style={[styles.confirmBtn, isPurchasing && { opacity: 0.7 }]} 
            onPress={onConfirm}
            disabled={isPurchasing}
          >
            {isPurchasing ? (
              <Text style={styles.btnText}>처리 중...</Text>
            ) : (
              <Text style={styles.btnText}>
                {isRaffle ? '응모하기' : '구매 확정'}
              </Text>
            )}
          </TouchableOpacity>
          
          <Text style={styles.infoText}>
            {isRaffle ? "당첨 결과는 추후 문자로 안내됩니다." : "구매 시 3일 내 문자로 발송됩니다."}
          </Text>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', alignItems: 'center' 
  },
  card: { 
    width: width * 0.85, backgroundColor: 'white', 
    borderRadius: 24, overflow: 'hidden', alignItems: 'center',
    elevation: 5 
  },
  closeBtn: { 
    position: 'absolute', top: 16, right: 16, zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 20, padding: 4
  },
  image: { width: '100%', height: 180, backgroundColor: '#f3f4f6' },
  content: { width: '100%', padding: 24, paddingBottom: 16 },
  subTitle: { fontSize: 13, color: '#6b7280', fontWeight: '600', marginBottom: 4 },
  prodName: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  divider: { height: 1, backgroundColor: '#f3f4f6', width: '100%', marginVertical: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 14, color: '#6b7280' },
  value: { fontSize: 14, fontWeight: '600', color: '#374151' },
  
  confirmBtn: {
    width: '85%', backgroundColor: '#15803d', paddingVertical: 16, borderRadius: 16,
    alignItems: 'center', marginBottom: 12
  },
  btnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  infoText: { fontSize: 12, color: '#9ca3af', marginBottom: 24 }
});