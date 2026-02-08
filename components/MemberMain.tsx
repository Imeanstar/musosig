/**
 * MemberMain.tsx
 * - [추가됨] 성경 말씀 기능 (프리미엄)
 * - [수정됨] 수학(EASY) 일반 기능화
 * - AppState: 앱이 백그라운드에서 돌아올 때 자동 새로고침
 * - 안부 완료 시 초록색 버튼 변경
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  AppState, ActivityIndicator 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Heart, Calculator, Camera, Smartphone, CheckCircle, 
  RefreshCw, Settings, Phone, BookOpen 
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { UserInfo } from '../types';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';

// Hooks
import { useMathChallenge } from '../hooks/useMathChallenge';
import { useCameraCapture } from '../hooks/useCameraCapture';

// Modals
import { MemberSettingsModal } from './modals/MemberSettingsModal';
import { FakeCallModal } from './modals/FakeCallModal';
import { MathChallengeModal } from './modals/MathChallengeModal';
import { CameraModal } from './modals/CameraModal';
import { ShakeModal } from './modals/ShakeModal';
import { BibleModal } from './modals/BibleModal'; // 📖 추가됨
import CustomAlertModal from './modals/CustomAlertModal';

interface MemberMainProps {
  userInfo: UserInfo;
  onBack: () => void;
}

export function MemberMain({ userInfo: initialUserInfo, onBack }: MemberMainProps) {
  const insets = useSafeAreaInsets();
  
  // 상태 관리
  const [userInfo, setUserInfo] = useState<UserInfo>(initialUserInfo);
  const [isLoading, setIsLoading] = useState(false);
  
  // 모달 상태들
  const [showSettings, setShowSettings] = useState(false);
  const [showFakeCall, setShowFakeCall] = useState(false);
  const [showBible, setShowBible] = useState(false); // 📖 추가됨
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // 인증 Hooks & State
  const math = useMathChallenge();
  const camera = useCameraCapture();
  const [isShakeModalOpen, setIsShakeModalOpen] = useState(false);

  // ✅ 오늘 안부 완료 여부 체크 (날짜 비교 로직)
  const isDoneToday = (() => {
    if (!userInfo.is_safe_today) return false; 
    if (!userInfo.last_seen_at) return false;  

    // 마지막 접속 날짜가 '오늘'인지 확인
    const lastDate = new Date(userInfo.last_seen_at).toDateString();
    const todayDate = new Date().toDateString();

    return lastDate === todayDate; 
  })();

  // 🔄 최신 정보 불러오기
  const fetchLatestData = async () => {
    try {
      const { data: myData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userInfo.id)
        .single();

      if (error || !myData) return;

      // 매니저 프리미엄 여부 확인 (상속)
      let isManagerPremium = false;
      if (myData.manager_id) {
        const { data: managerData } = await supabase
          .from('users')
          .select('is_premium')
          .eq('id', myData.manager_id)
          .single();
        
        isManagerPremium = managerData?.is_premium || false;
      }

      setUserInfo({
        ...myData,
        is_premium: myData.is_premium || isManagerPremium
      });
      
      console.log('🔄 데이터 갱신 완료:', myData.last_seen_at);
    } catch (e) {
      console.error("데이터 갱신 실패:", e);
    }
  };

  // ⚡️ 앱이 다시 켜질 때(Foreground) 데이터 자동 갱신
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    fetchLatestData();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('⚡️ 앱이 다시 활성화되었습니다! 데이터 새로고침...');
        fetchLatestData();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);


  // 사진 업로드 로직
  const uploadImage = async (uri: string): Promise<string> => {
    const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${userInfo.id}/${Date.now()}.${ext}`;
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const { error } = await supabase.storage
      .from('proof_shots')
      .upload(fileName, decode(base64), { contentType: 'image/jpeg', upsert: false });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('proof_shots')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  // 체크인 완료 처리
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
      await supabase
        .from('check_in_logs')
        .insert({ 
          member_id: userInfo.id,
          check_in_type: type,
          proof_url: uploadedUrl 
        });

      // 3. 화면 즉시 갱신 (Optimistic Update)
      setUserInfo(prev => ({
        ...prev,
        last_seen_at: nowISO,
        is_safe_today: true
      }));

      // 모달 닫기 (카메라/성경 등)
      if (camera.isVisible) camera.close();
      if (showBible) setShowBible(false); 
      
      // 성공 메시지 설정
      let msg = "오늘도 무소식을 전했습니다! 👋\n오늘 하루도 힘내세요!";
      if (uploadedUrl) msg = "사진과 함께 무소식을 전했습니다! 📸\n오늘 하루도 힘내세요!";
      if (type === '성경 말씀') msg = "말씀과 함께 안부를 전했습니다 🙏\n평안한 하루 되세요.";

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

  // 버튼 클릭 핸들러
  const handleCheckInPress = () => {
    if (isDoneToday) return;

    const method = userInfo.settings?.checkInMethod || '클릭';
    
    switch (method) {
      case '클릭': 
        completeCheckIn(null, '클릭'); 
        break;
      case '수학(EASY)': 
        // 🔒 이제 누구나 사용 가능 (프리미엄 체크 X)
        math.generate('easy'); 
        break;
      case '수학(HARD)': 
        // 🔒 HARD는 여전히 프리미엄 유지하고 싶다면 여기서 체크 가능
        math.generate('hard'); 
        break;
      case '사진인증': 
        camera.open(); 
        break;
      case '흔들기': 
        setIsShakeModalOpen(true); 
        break;
      case '성경말씀': // 📖 새로 추가된 옵션
        if (userInfo.is_premium) {
          setShowBible(true);
        } else {
          // 혹시 설정이 꼬여서 프리미엄 아닌데 이 옵션일 경우 대비
          setErrorMessage("프리미엄 전용 기능입니다.");
          setErrorModalVisible(true);
        }
        break;
      default: 
        completeCheckIn();
    }
  };

  // UI 아이콘 헬퍼
  const getMethodIcon = () => {
    if (isDoneToday) return <CheckCircle size={64} color="#15803d" />;

    const method = userInfo.settings?.checkInMethod || '클릭';
    switch (method) {
      case '수학(EASY)': 
      case '수학(HARD)': return <Calculator size={56} color="white" />;
      case '사진인증': return <Camera size={56} color="white" />;
      case '흔들기': return <Smartphone size={56} color="white" />;
      case '성경말씀': return <BookOpen size={56} color="white" />; // 📖 책 아이콘
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
      case '성경말씀': return "오늘의 말씀 읽기"; // 📖
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
            
            {/* 펄스 효과 (미완료일 때만) */}
            {!isDoneToday && <View style={styles.pulseRing} />} 
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
            
            {/* 마지막 안부 카드 */}
            <TouchableOpacity style={styles.halfCard} onPress={fetchLatestData} activeOpacity={0.7}>
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

            {/* 긴급 도구 카드 (프리미엄) */}
            <TouchableOpacity 
              style={[styles.halfCard, !userInfo.is_premium && styles.disabledCard]} 
              onPress={() => {
                if (userInfo.is_premium) {
                  setShowFakeCall(true);
                } else {
                  // Alert 대신 커스텀 모달 사용 가능 (지금은 간단히 처리)
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

      {/* ================= 모달들 ================= */}
      
      {/* 📖 성경 모달 */}
      <BibleModal 
        visible={showBible}
        onConfirm={() => completeCheckIn(null, '성경 말씀')}
      />

      <MathChallengeModal
        visible={math.isVisible}
        n1={math.problem.n1}
        n2={math.problem.n2}
        userAnswer={math.userAnswer}
        onChangeAnswer={math.setUserAnswer}
        onConfirm={() => math.check(() => completeCheckIn(null, '수학 문제'))}
        onCancel={math.close}
      />

      <CameraModal
        visible={camera.isVisible}
        photoUri={camera.photoUri}
        cameraRef={camera.cameraRef}
        onTakePicture={camera.takePicture}
        onRetake={camera.retake}
        onSend={() => completeCheckIn(camera.photoUri, '사진 인증')}
        onClose={camera.close}
        isLoading={isLoading}
      />

      <ShakeModal
        visible={isShakeModalOpen}
        onCancel={() => setIsShakeModalOpen(false)}
        onComplete={() => {
          setIsShakeModalOpen(false);
          completeCheckIn(null, '흔들어서 안부');
        }}
      />

      <MemberSettingsModal 
        visible={showSettings}
        onClose={() => {
          setShowSettings(false);
          fetchLatestData(); // 설정 닫을 때도 갱신
        }}
        onLogout={() => {
          setShowSettings(false);
          onBack();
        }}
        isPremium={!!userInfo.is_premium}
      />

      <FakeCallModal 
        visible={showFakeCall} 
        onClose={() => setShowFakeCall(false)} 
      />

      {/* 성공 알림 모달 */}
      <CustomAlertModal
        visible={successModalVisible}
        title="안부 전송 완료! 🚀"
        message={successMessage}
        confirmText="확인"
        type="default" 
        onClose={() => {
          setSuccessModalVisible(false);
          fetchLatestData();
        }}
        onConfirm={() => {
          setSuccessModalVisible(false);
          fetchLatestData();
        }}
      />

      {/* 에러 알림 모달 */}
      <CustomAlertModal
        visible={errorModalVisible}
        title="알림"
        message={errorMessage}
        confirmText="확인"
        type="danger" 
        onClose={() => setErrorModalVisible(false)}
        onConfirm={() => setErrorModalVisible(false)}
        cancelText="닫기"
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  topBar: { 
    backgroundColor: 'white', 
    paddingHorizontal: 24, 
    paddingBottom: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f3f4f6', 
    elevation: 4, 
    zIndex: 10,
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  topBarGreeting: { fontSize: 16, color: '#6b7280', marginBottom: 2 },
  topBarName: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  settingsBtn: { 
    padding: 10, 
    backgroundColor: 'white', 
    borderRadius: 20, 
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f3f4f6'
  },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  infoRow: { flexDirection: 'row', marginBottom: 20 },
  subGreeting: { fontSize: 16, color: '#4b5563', lineHeight: 24, flex: 1 },
  centerArea: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  mainButtonContainer: { width: 200, height: 200, justifyContent: 'center', alignItems: 'center', marginBottom: 24, position: 'relative' },
  mainButton: { width: 180, height: 180, borderRadius: 90, justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: '#ef4444', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, zIndex: 2 },
  pulseRing: { position: 'absolute', width: 220, height: 220, borderRadius: 110, borderWidth: 2, borderColor: '#fca5a5', opacity: 0.5, zIndex: 1 },
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