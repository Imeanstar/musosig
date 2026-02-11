/**
 * StoreModal.tsx (v3.0 - Purchase History Added)
 * - 🌲 포레스트 그린 테마
 * - 📜 구매 내역(영수증) 조회 기능 추가
 * - 💬 구매 시 "문자 발송" 안내 알림
 */
import React, { useEffect, useState } from 'react';
import { 
  Modal, View, Text, StyleSheet, TouchableOpacity, 
  FlatList, Image, Alert, ActivityIndicator, Dimensions 
} from 'react-native';
import { X, Coins, History, ArrowLeft } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { StoreConfirmModal } from './StoreConfirmModal'; // 👈 추가
import CustomAlertModal from './CustomAlertModal'; // 👈 완료 알림용

interface Product {
  id: number;
  name: string;
  price: number;
  image_url: string;
  category: string;
  description: string;
}

// 📜 포인트 로그 타입 정의
interface PointLog {
  id: number;
  created_at: string;
  amount: number;
  description: string;
  type: string;
}

interface StoreModalProps {
  visible: boolean;
  onClose: () => void;
  myPoints: number;
  onPurchaseComplete: () => void;
}

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2;

export function StoreModal({ visible, onClose, myPoints, onPurchaseComplete }: StoreModalProps) {
  const [viewMode, setViewMode] = useState<'store' | 'history'>('store'); // 탭 상태
  const [products, setProducts] = useState<Product[]>([]);
  const [historyLogs, setHistoryLogs] = useState<PointLog[]>([]); // 내역 데이터
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<number | null>(null);
  const [confirmProduct, setConfirmProduct] = useState<Product | null>(null); // 선택한 상품
  const [showSuccess, setShowSuccess] = useState(false); // 구매 성공 모달
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (visible) {
      setViewMode('store'); // 켤 때는 항상 상점 모드
      fetchProducts();
    }
  }, [visible]);

  // 1. 상품 목록 가져오기
  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('price', { ascending: true });

    if (!error && data) setProducts(data);
    setLoading(false);
  };

  // 2. 구매 내역(사용 로그) 가져오기
  const fetchHistory = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('point_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', '사용') // '적립' 말고 '사용'만
      .order('created_at', { ascending: false }); // 최신순

    if (!error && data) setHistoryLogs(data);
    setLoading(false);
  };

  // 탭 전환 핸들러
  const switchMode = (mode: 'store' | 'history') => {
    setViewMode(mode);
    if (mode === 'store') fetchProducts();
    else fetchHistory();
  };

  // 구매 로직
  const handleBuy = (product: Product) => {
    if (myPoints < product.price) {
      // 잔액 부족은 간단한 Alert나 토스트로 유지해도 무방 (혹은 커스텀 모달 재활용)
      Alert.alert("포인트 부족", "포인트가 부족합니다 😢");
      return;
    }
    setConfirmProduct(product); // 모달 Open!
  };

  // 2. [NEW] 실제 구매 로직 (모달에서 '확인' 누르면 실행)
  const executePurchase = async () => {
    if (!confirmProduct) return;
    
    try {
      setPurchasingId(confirmProduct.id); // 로딩 시작

      // (1) 포인트 차감
      const { error: rpcError } = await supabase.rpc('increment_points', { 
        row_id: (await supabase.auth.getUser()).data.user?.id,
        amount: -confirmProduct.price 
      });
      if (rpcError) throw rpcError;

      // (2) 로그 기록
      const isRaffle = confirmProduct.name.includes('응모권');
      await supabase.from('point_logs').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        type: '사용',
        amount: -confirmProduct.price,
        description: `${confirmProduct.name} ${isRaffle ? '응모' : '구매'}`
      });

      // (3) 성공 처리
      setConfirmProduct(null); // 확인 모달 닫기
      
      const msg = isRaffle 
        ? "응모가 완료되었습니다! 🍀\n결과는 추후 문자로 안내드립니다."
        : "구매가 완료되었습니다! 🎁\n상품은 3일 내 문자로 발송됩니다.";
      
      setSuccessMsg(msg);
      setShowSuccess(true); // 성공 모달 Open!
      onPurchaseComplete();

    } catch (e) {
      console.error(e);
      Alert.alert("오류", "구매 중 문제가 발생했습니다.");
    } finally {
      setPurchasingId(null); // 로딩 끝
    }
  };

  // [렌더링] 상품 카드
  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="cover" />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{item.category}</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.prodName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.prodDesc} numberOfLines={1}>{item.description}</Text>
        <View style={styles.priceRow}>
          <View style={{flexDirection:'row', alignItems:'center'}}>
             <Coins size={14} color="#15803d" />
             <Text style={styles.prodPrice}>{item.price.toLocaleString()} P</Text>
          </View>
          <TouchableOpacity 
            style={[styles.buyBtn, myPoints < item.price && styles.disabledBtn]}
            onPress={() => handleBuy(item)}
            disabled={purchasingId === item.id}
          >
            {purchasingId === item.id ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.buyBtnText}>
                {myPoints < item.price ? "부족" : (item.name.includes('응모권') ? "응모" : "교환")}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // [렌더링] 구매 내역 리스트 아이템
  const renderHistoryItem = ({ item }: { item: PointLog }) => {
    const date = new Date(item.created_at);
    const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;

    return (
      <View style={styles.historyItem}>
        <View style={{flex: 1}}>
          <Text style={styles.historyDesc}>{item.description}</Text>
          <Text style={styles.historyDate}>{dateStr}</Text>
        </View>
        <Text style={styles.historyAmount}>{item.amount} P</Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={{flexDirection:'row', alignItems:'center'}}>
            {viewMode === 'history' && (
              <TouchableOpacity onPress={() => switchMode('store')} style={{ marginRight: 10 }}>
                <ArrowLeft size={24} color="#374151" />
              </TouchableOpacity>
            )}
            <Text style={styles.headerTitle}>
              {viewMode === 'store' ? '포인트 상점' : '구매 내역'}
            </Text>
          </View>
          
          <View style={{flexDirection:'row'}}>
             {/* 📜 구매 내역 버튼 (상점 모드일 때만 보임) */}
             {viewMode === 'store' && (
               <TouchableOpacity onPress={() => switchMode('history')} style={[styles.iconBtn, {marginRight: 8}]}>
                 <History size={20} color="#15803d" />
                 <Text style={styles.historyBtnText}>내역</Text>
               </TouchableOpacity>
             )}
             <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
               <X size={24} color="#374151" />
             </TouchableOpacity>
          </View>
        </View>

        {/* 내 포인트 정보 (공통) */}
        <View style={styles.myPointBar}>
          <Text style={styles.myPointLabel}>보유 포인트</Text>
          <Text style={styles.myPointValue}>{myPoints.toLocaleString()} P</Text>
        </View>

        {/* 메인 컨텐츠 영역 */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#15803d" />
          </View>
        ) : (
          <>
            {/* 1. 상점 화면 */}
            {viewMode === 'store' && (
              <FlatList
                data={products}
                renderItem={renderProduct}
                keyExtractor={item => item.id.toString()}
                numColumns={2}
                columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 16 }}
                contentContainerStyle={{ paddingBottom: 40, paddingTop: 16 }}
              />
            )}

            {/* 2. 구매 내역 화면 */}
            {viewMode === 'history' && (
              <FlatList
                data={historyLogs}
                renderItem={renderHistoryItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={{ padding: 16 }}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>아직 구매한 내역이 없어요.</Text>
                    <Text style={styles.emptySubText}>포인트를 모아 선물을 받아보세요!</Text>
                  </View>
                }
              />
            )}
          </>
        )}
        {/* 1. 구매 확인 모달 (영수증 스타일) */}
        <StoreConfirmModal 
           visible={!!confirmProduct}
           product={confirmProduct}
           myPoints={myPoints}
           isPurchasing={!!purchasingId}
           onClose={() => setConfirmProduct(null)}
           onConfirm={executePurchase}
         />

         {/* 2. 구매 성공 모달 (기존 커스텀 모달 재활용) */}
         <CustomAlertModal
            visible={showSuccess}
            title="처리 완료 🎉"
            message={successMsg}
            type="default"
            confirmText="확인"
            onClose={() => setShowSuccess(false)}
            onConfirm={() => setShowSuccess(false)}
         />

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // 헤더
  header: { 
    padding: 16, paddingHorizontal: 20, paddingTop: 20, 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f3f4f6'
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  iconBtn: { padding: 8, flexDirection: 'row', alignItems: 'center' },
  historyBtnText: { marginLeft: 4, fontSize: 14, fontWeight: '600', color: '#15803d' },

  // 내 포인트 바
  myPointBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#f0fdf4', padding: 16, paddingHorizontal: 24,
    borderBottomWidth: 1, borderBottomColor: '#dcfce7'
  },
  myPointLabel: { fontSize: 15, fontWeight: '600', color: '#166534' },
  myPointValue: { fontSize: 20, fontWeight: 'bold', color: '#15803d' },

  // 상품 카드
  card: {
    width: COLUMN_WIDTH, backgroundColor: 'white', borderRadius: 12, marginBottom: 16,
    elevation: 2, shadowColor: '#000', shadowOffset: {width:0, height:1}, shadowOpacity: 0.05, shadowRadius: 4,
    overflow: 'hidden', borderWidth: 1, borderColor: '#f3f4f6'
  },
  image: { width: '100%', height: 120, backgroundColor: '#e5e7eb' },
  badge: {
    position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6
  },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  cardContent: { padding: 12 },
  prodName: { fontSize: 15, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  prodDesc: { fontSize: 12, color: '#6b7280', marginBottom: 10 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  prodPrice: { fontSize: 14, fontWeight: 'bold', color: '#15803d', marginLeft: 4 },
  buyBtn: { backgroundColor: '#15803d', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  disabledBtn: { backgroundColor: '#e5e7eb' },
  buyBtnText: { color: 'white', fontSize: 13, fontWeight: 'bold' },

  // 구매 내역 리스트 스타일
  historyItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'white', padding: 16, marginBottom: 10, borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb'
  },
  historyDesc: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginBottom: 4 },
  historyDate: { fontSize: 12, color: '#9ca3af' },
  historyAmount: { fontSize: 16, fontWeight: 'bold', color: '#ef4444' }, // 차감은 빨간색
  
  // 빈 화면
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, fontWeight: 'bold', color: '#4b5563', marginBottom: 8 },
  emptySubText: { fontSize: 14, color: '#9ca3af' }
});