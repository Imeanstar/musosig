/**
 * MemberMain.tsx
 * - 🔄 Context API 완벽 적용 (독립적인 Fetch 로직 제거)
 * - 💎 클린 그레이 UI 유지
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  AppState, ActivityIndicator, Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Heart, Calculator, Camera, Smartphone, CheckCircle, 
  RefreshCw, Settings, Phone, BookOpen, Coins, ChevronRight 
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';

// ✅ Context 가져오기 (가장 중요!)
import { useUserManagement } from '../hooks/useUserManagement'; 
// 또는 useUserContext를 직접 써도 되지만, 기존 hook이 감싸고 있다면 그걸 쓰는 게 좋습니다.
// 만약 useUserManagement가 Context를 쓰게 수정되었다면 위 import 유지.
// 아니라면: import { useUserContext } from '../contexts/UserContext'; 

// Hooks
import { useMathChallenge } from '../hooks/useMathChallenge';
import { useCameraCapture } from '../hooks/useCameraCapture';

// Modals
import { MemberSettingsModal } from './modals/MemberSettingsModal';
import { FakeCallModal } from './modals/FakeCallModal';
import { MathChallengeModal } from './modals/MathChallengeModal';
import { CameraModal } from './modals/CameraModal';
import { ShakeModal } from './modals/ShakeModal';
import { BibleModal } from './modals/BibleModal';
import CustomAlertModal from './modals/CustomAlertModal';
import { StoreModal } from './modals/StoreModal';

interface MemberMainProps {
  // userInfo는 이제 Props로 안 받아도 됨 (Context에서 가져옴)
  onBack: () => void;
}

export function MemberMain({ onBack }: MemberMainProps) {
  const insets = useSafeAreaInsets();
  
  // ✅ 전역 상태 사용 (여기서 userInfo를 가져옵니다)
  // (만약 useUserManagement가 Context를 쓰도록 수정 안 됐다면 useUserContext() 사용)
  const { userInfo, loadUser } = useUserManagement(); 

  // 로컬 UI 상태
  const [points, setPoints] = useState(userInfo?.points || 0); // 초기값
  const [isLoading, setIsLoading] = useState(false);
  
  // 모달 상태들
  const [showSettings, setShowSettings] = useState(false);
  const [showFakeCall, setShowFakeCall] = useState(false);
  const [showBible, setShowBible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showStore, setShowStore] = useState(false);

  // 인증 Hooks
  const math = useMathChallenge();
  const camera = useCameraCapture();
  const [isShakeModalOpen, setIsShakeModalOpen] = useState(false);

  // userInfo가 없을 때 방어 코드
  if (!userInfo) {
      return <View style={styles.container}><ActivityIndicator /></View>;
  }

  // ✅ 오늘 안부 완료 여부 체크
  const isDoneToday = (() => {
    if (!userInfo.is_safe_today) return false; 
    if (!userInfo.last_seen_at) return false;  
    const lastDate = new Date(userInfo.last_seen_at).toDateString();
    const todayDate = new Date().toDateString();
    return lastDate === todayDate; 
  })();

  // 🔄 데이터 갱신 (이제 Context의 loadUser를 씁니다)
  const handleRefresh = async () => {
    try {
        setIsLoading(true);
        // loadUser 내부에서 이미 RPC 호출 등 모든 처리가 다 되어 있음!
        const updatedUser = await loadUser(); 
        if (updatedUser) {
            setPoints(updatedUser.points || 0);
        }
    } catch (e) {
        console.error(e);
    } finally {
        setIsLoading(false);
    }
  };

  // ⚡️ 앱 활성화 시 자동 갱신
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    // 처음 켜질 때 포인트 동기화
    setPoints(userInfo.points || 0);
    
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        handleRefresh();
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, []);

  // 사진 업로드
  const uploadImage = async (uri: string): Promise<string> => {
    const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${userInfo.id}/${Date.now()}.${ext}`;
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const { error } = await supabase.storage.from('proof_shots').upload(fileName, decode(base64), { contentType: 'image/jpeg', upsert: false });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('proof_shots').getPublicUrl(fileName);
    return publicUrl;
  };

  // 💎 체크인 완료 및 포인트 적립
  const completeCheckIn = async (imageUri?: string | null, type: string = '클릭') => {
    if (isLoading || isDoneToday) return;

    try {
      setIsLoading(true);
      let uploadedUrl = null;
      if (imageUri) {
        uploadedUrl = await uploadImage(imageUri);
      }
      const nowISO = new Date().toISOString();

      // 1. DB 업데이트
      const { error } = await supabase
        .from('users')
        .update({ 
          last_seen_at: nowISO,
          last_proof_url: uploadedUrl,
          is_safe_today: true, 
          updated_at: nowISO
        })
        .eq('id', userInfo.id);

      if (error) throw error;

      // 2. 로그 기록
      await supabase.from('check_in_logs').insert({ 
          member_id: userInfo.id,
          check_in_type: type,
          proof_url: uploadedUrl 
      });

      // 💎 3. 포인트 적립
      const EARN_AMOUNT = Math.floor(Math.random() * 15) + 1;
      const { error: pointError } = await supabase.rpc('increment_points', { 
        row_id: userInfo.id, 
        amount: EARN_AMOUNT 
      });

      if (pointError) console.error("포인트 적립 실패:", pointError);
      else {
        await supabase.from('point_logs').insert({
          user_id: userInfo.id,
          type: '적립',
          amount: EARN_AMOUNT,
          description: `안부 확인 (${type})`
        });
      }

      // 4. 화면 갱신 (Context 업데이트 호출)
      await handleRefresh(); 

      if (camera.isVisible) camera.close();
      if (showBible) setShowBible(false); 
      
      let msg = `오늘 안부 완료! (+${EARN_AMOUNT}P 적립 💰)\n매일 적립해서 선물로 교환해보세요!`;
      if (uploadedUrl) msg = `사진 안부 완료! (+${EARN_AMOUNT}P 적립 💰)\n매일 적립해서 선물로 교환해보세요!`;
      if (type === '성경 말씀') msg = `말씀 안부 완료! (+${EARN_AMOUNT}P 적립 💰)\n평안한 하루 되세요.`;

      setSuccessMessage(msg);      
      setSuccessModalVisible(true); 

    } catch (e: any) {
      console.error(e);
      setErrorMessage(e.message || "알 수 없는 오류가 발생했습니다.");
      setErrorModalVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckInPress = () => {
    if (isDoneToday) return;
    const method = userInfo.settings?.checkInMethod || '클릭';
    switch (method) {
      case '클릭': completeCheckIn(null, '클릭'); break;
      case '수학(EASY)': math.generate('easy'); break;
      case '수학(HARD)': math.generate('hard'); break;
      case '사진인증': camera.open(); break;
      case '흔들기': setIsShakeModalOpen(true); break;
      case '성경말씀': 
        if (userInfo.is_premium) setShowBible(true);
        else { setErrorMessage("프리미엄 전용 기능입니다."); setErrorModalVisible(true); }
        break;
      default: completeCheckIn();
    }
  };

  const getMethodIcon = () => {
    if (isDoneToday) return <CheckCircle size={64} color="#15803d" />;
    const method = userInfo.settings?.checkInMethod || '클릭';
    switch (method) {
      case '수학(EASY)': case '수학(HARD)': return <Calculator size={56} color="white" />;
      case '사진인증': return <Camera size={56} color="white" />;
      case '흔들기': return <Smartphone size={56} color="white" />;
      case '성경말씀': return <BookOpen size={56} color="white" />;
      default: return <Heart size={64} color="white" fill="white" />;
    }
  };

  const getMethodLabel = () => {
    if (isDoneToday) return "오늘 안부 완료!";
    const method = userInfo.settings?.checkInMethod || '클릭';
    switch (method) {
      case '수학(EASY)': return "쉬운 계산 풀기";
      case '수학(HARD)': return "두뇌 튼튼 계산";
      case '사진인증': return "사진 찍어 보내기";
      case '흔들기': return "휴대폰 흔들기";
      case '성경말씀': return "오늘의 말씀 읽기";
      default: return "안부 전하기";
    }
  };

  return (
    <View style={styles.container}>
      
      {/* 상단 바 */}
      <View style={[styles.topBar, { paddingTop: insets.top + 20 }]}>
        <View>
          <Text style={styles.topBarGreeting}>안녕하세요,</Text>
          <Text style={styles.topBarName}>{userInfo.name || '회원'} 님!</Text>
        </View>
        <TouchableOpacity style={styles.settingsBtn} onPress={() => setShowSettings(true)}>
          <Settings size={24} color="#4b5563" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        
        {/* 포인트 카드 */}
        <View style={styles.glassCardContainer}>
          <LinearGradient
            colors={['rgba(255,255,255,0.95)', 'rgba(243,244,246,0.9)']}
            style={styles.glassCard}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          >
            <View style={styles.pointRow}>
              <View style={styles.coinCircle}>
                <Coins size={24} color="#d97706" fill="#fbbf24" />
              </View>
              <View>
                <Text style={styles.pointLabel}>내 포인트</Text>
                <Text style={styles.pointValue}>{points.toLocaleString()} P</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.shopBtn} 
              onPress={() => setShowStore(true)}
            >
              <Text style={styles.shopBtnText}>상점 가기</Text>
              <ChevronRight size={16} color="#15803d" />
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.subGreeting}>
            {isDoneToday 
              ? "오늘 할 일을 모두 마치셨네요!\n편안한 하루 되세요 🌿" 
              : "오늘도 무소식과 함께\n활기찬 하루 보내세요!"}
          </Text>
        </View>

        {/* 메인 버튼 */}
        <View style={styles.centerArea}>
          <TouchableOpacity 
            style={styles.mainButtonContainer} 
            onPress={handleCheckInPress}
            activeOpacity={0.8}
            disabled={isDoneToday || isLoading}
          >
            <LinearGradient
              colors={isDoneToday ? ['#dcfce7', '#bbf7d0'] : ['#ef4444', '#f43f5e']}
              style={[
                styles.mainButton,
                isDoneToday && { borderWidth: 4, borderColor: '#86efac', elevation: 0 }
              ]}
            >
              {isLoading ? <ActivityIndicator color="white" size="large" /> : getMethodIcon()}
            </LinearGradient>
          </TouchableOpacity>
          
          <Text style={[styles.actionLabel, isDoneToday && { color: '#15803d' }]}>
            {getMethodLabel()}
          </Text>
          <Text style={styles.actionSubLabel}>
            {isDoneToday ? "내일 또 만나요!" : "버튼을 눌러 안부를 전해주세요"}
          </Text>
        </View>

        {/* 하단 카드 */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.bottomRow}>
            <TouchableOpacity style={styles.halfCard} onPress={handleRefresh} activeOpacity={0.7}>
              <View style={styles.cardHeader}>
                <RefreshCw size={14} color="#9ca3af" />
                <Text style={styles.cardLabel}>마지막 안부</Text>
              </View>
              <View style={styles.cardBody}>
                <CheckCircle size={24} color={isDoneToday ? "#10b981" : "#9ca3af"} style={{ marginBottom: 8 }} />
                <Text style={styles.cardValueText} numberOfLines={2}>
                  {userInfo.last_seen_at 
                    ? new Date(userInfo.last_seen_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                    : '-'}
                </Text>
                <Text style={styles.cardDateText}>
                  {userInfo.last_seen_at 
                    ? new Date(userInfo.last_seen_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
                    : '기록 없음'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.halfCard, !userInfo.is_premium && styles.disabledCard]} 
              onPress={() => {
                if (userInfo.is_premium) setShowFakeCall(true);
                else {
                   setErrorMessage("보호자가 프리미엄 회원이어야 사용할 수 있습니다 🔒");
                   setErrorModalVisible(true);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.cardLabel, { color: '#ef4444' }]}>긴급 도구</Text>
              </View>
              <View style={styles.cardBody}>
                <View style={styles.iconCircle}>
                   <Phone size={24} color="#ef4444" />
                </View>
                <Text style={styles.cardValueText}>페이크 콜</Text>
                <Text style={styles.cardDateText}>가짜 전화 걸기</Text>
              </View>
              {!userInfo.is_premium && (
                <View style={styles.lockOverlay}>
                  <Text style={{ fontSize: 24 }}>🔒</Text>
                  <Text style={styles.lockText}>Premium</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 모달들 */}
      <BibleModal visible={showBible} onConfirm={() => completeCheckIn(null, '성경 말씀')} />
      <MathChallengeModal
        visible={math.isVisible} n1={math.problem.n1} n2={math.problem.n2}
        userAnswer={math.userAnswer} onChangeAnswer={math.setUserAnswer}
        onConfirm={() => math.check(() => completeCheckIn(null, '수학 문제'))} onCancel={math.close}
      />
      <CameraModal
        visible={camera.isVisible} photoUri={camera.photoUri} cameraRef={camera.cameraRef}
        onTakePicture={camera.takePicture} onRetake={camera.retake}
        onSend={() => completeCheckIn(camera.photoUri, '사진 인증')} onClose={camera.close} isLoading={isLoading}
      />
      <ShakeModal
        visible={isShakeModalOpen} onCancel={() => setIsShakeModalOpen(false)}
        onComplete={() => { setIsShakeModalOpen(false); completeCheckIn(null, '흔들어서 안부'); }}
      />
      <MemberSettingsModal 
        visible={showSettings} onClose={() => { setShowSettings(false); handleRefresh(); }}
        onLogout={() => { setShowSettings(false); onBack(); }} isPremium={!!userInfo.is_premium}
      />
      <FakeCallModal visible={showFakeCall} onClose={() => setShowFakeCall(false)} />
      
      <CustomAlertModal
        visible={successModalVisible} title="안부 전송 완료! 🚀" message={successMessage}
        confirmText="확인" type="default" 
        onClose={() => { setSuccessModalVisible(false); handleRefresh(); }}
        onConfirm={() => { setSuccessModalVisible(false); handleRefresh(); }}
      />
      <CustomAlertModal
        visible={errorModalVisible} title="알림" message={errorMessage}
        confirmText="확인" type="danger" 
        onClose={() => setErrorModalVisible(false)} onConfirm={() => setErrorModalVisible(false)} cancelText="닫기"
      />
      <StoreModal 
        visible={showStore} 
        onClose={() => setShowStore(false)}
        myPoints={points}
        onPurchaseComplete={() => {
          handleRefresh(); // 포인트 갱신
        }}
      />
    </View>
  );
}

// 스타일은 그대로 유지 (변경 없음)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  glassCardContainer: { marginTop: 10, marginBottom: 20 },
  glassCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderRadius: 24,
    borderWidth: 1, borderColor: 'rgba(229, 231, 235, 0.5)', 
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  pointRow: { flexDirection: 'row', alignItems: 'center' },
  coinCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#f3f4f6', 
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  pointLabel: { fontSize: 13, color: '#166534', fontWeight: '600', marginBottom: 2 }, 
  pointValue: { fontSize: 22, fontWeight: 'bold', color: '#15803d' }, 
  shopBtn: {
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: '#f0fdf4', 
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
    borderWidth: 1, borderColor: '#dcfce7' 
  },
  shopBtnText: { fontSize: 13, color: '#15803d', fontWeight: '600', marginRight: 4 }, 

  topBar: { 
    backgroundColor: 'transparent',
    paddingHorizontal: 24, paddingBottom: 20, 
    zIndex: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' 
  },
  topBarGreeting: { fontSize: 16, color: '#6b7280', marginBottom: 2 },
  topBarName: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  settingsBtn: { 
    padding: 10, backgroundColor: 'white',
    borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', elevation: 1
  },
  
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 10 },
  infoRow: { flexDirection: 'row', marginBottom: 20 },
  subGreeting: { fontSize: 16, color: '#4b5563', lineHeight: 24, flex: 1 },
  centerArea: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  mainButtonContainer: { width: 200, height: 200, justifyContent: 'center', alignItems: 'center', marginBottom: 24, position: 'relative' },
  mainButton: { width: 180, height: 180, borderRadius: 90, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, zIndex: 2 },
  actionLabel: { fontSize: 28, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  actionSubLabel: { fontSize: 16, color: '#6b7280' },
  footer: {},
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  halfCard: { flex: 1, backgroundColor: 'white', borderRadius: 20, padding: 16, height: 140, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, justifyContent: 'space-between' },
  disabledCard: { backgroundColor: '#f3f4f6', opacity: 0.9 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardLabel: { fontSize: 12, color: '#6b7280', marginLeft: 4, fontWeight: '600' },
  cardBody: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  cardValueText: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 2 },
  cardDateText: { fontSize: 12, color: '#9ca3af' },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  lockOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 20, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  lockText: { fontSize: 12, fontWeight: 'bold', color: '#6b7280', marginTop: 4 },
});