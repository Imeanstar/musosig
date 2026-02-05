/**
 * MemberMain.tsx (Final Refactored)
 * - 안부 완료 시 초록색 버튼으로 변경 및 비활성화
 * - 흔들기/사진 인증 로직 안정화
 * - UX 개선
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, Calculator, Camera, Smartphone, CheckCircle, RefreshCw, Settings } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { UserInfo } from '../types';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';

// Hooks
import { useMathChallenge } from '../hooks/useMathChallenge';
import { useCameraCapture } from '../hooks/useCameraCapture';
import { useShakeDetector } from '../hooks/useShakeDetector';

// Modals
import { MemberSettingsModal } from './modals/MemberSettingsModal';
import { FakeCallModal } from './modals/FakeCallModal';
import { MathChallengeModal } from './modals/MathChallengeModal';
import { CameraModal } from './modals/CameraModal';
import { ShakeModal } from './modals/ShakeModal';

interface MemberMainProps {
  userInfo: UserInfo;
  onBack: () => void;
}

export function MemberMain({ userInfo: initialUserInfo, onBack }: MemberMainProps) {
  const insets = useSafeAreaInsets();
  
  // 상태
  const [userInfo, setUserInfo] = useState<UserInfo>(initialUserInfo);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFakeCall, setShowFakeCall] = useState(false);

  // [수정 전] 단순히 DB 값만 믿음
  // const isDoneToday = userInfo.is_safe_today || false;

  // ✅ [수정 후] 날짜까지 확인하는 똑똑한 로직
  const isDoneToday = (() => {
    if (!userInfo.is_safe_today) return false; // 일단 false면 무조건 안 한 거
    if (!userInfo.last_seen_at) return false;  // 기록 없어도 안 한 거

    // 마지막 접속 날짜가 '오늘'인지 확인
    const lastDate = new Date(userInfo.last_seen_at).toDateString();
    const todayDate = new Date().toDateString();

    return lastDate === todayDate; // 날짜가 같아야 진짜 한 거!
  })();

  // 인증 Hooks
  const math = useMathChallenge();
  const camera = useCameraCapture();
  const shake = useShakeDetector();

  // 초기화
  useEffect(() => {
    fetchLatestData();
    // 흔들기 감지 해제는 컴포넌트 언마운트 시
    return () => shake.unsubscribe();
  }, []);

  // 🚨 [수정 포인트] 흔들기 완료 감지 로직 추가 (useEffect)
  // shake.progress 값이 바뀔 때마다 검사합니다.
  useEffect(() => {
    // 1. 게이지가 1.0 (100%) 이상이고
    // 2. 현재 로딩 중이 아니고 (중복 방지)
    // 3. 오늘 이미 완료한 상태가 아니라면
    if (shake.progress >= 1 && !isLoading && !isDoneToday) {
      completeCheckIn(null, '흔들기'); // 완료 처리 실행!
    }
  }, [shake.progress]); // dependency에 progress 필수

  // 최신 정보 불러오기
  const fetchLatestData = async () => {
    try {
      const { data: myData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userInfo.id)
        .single();

      if (error || !myData) return;

      // 매니저 프리미엄 여부 확인
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
    } catch (e) {
      console.error("데이터 갱신 실패:", e);
    }
  };

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
    // 🚨 이미 로딩 중이면 중복 실행 방지
    if (isLoading) return;

    try {
      setIsLoading(true); // 로딩 시작
      let uploadedUrl = null;

      if (imageUri) {
        uploadedUrl = await uploadImage(imageUri);
      }

      // 1. 유저 정보 업데이트
      await supabase
        .from('users')
        .update({ 
          last_seen_at: new Date().toISOString(),
          last_proof_url: uploadedUrl,
          is_safe_today: true, // ✅ 즉시 상태 반영
          updated_at: new Date().toISOString()
        })
        .eq('id', userInfo.id);

      // 2. 로그 기록
      await supabase
        .from('check_in_logs')
        .insert({ 
          member_id: userInfo.id,
          check_in_type: type,
          proof_url: uploadedUrl 
        });

      // 3. 정리 및 알림
      shake.unsubscribe(); 
      camera.close();
      
      const message = uploadedUrl ? "사진과 함께 안부를 전했습니다! 📸" : "보호자에게 안부를 전했습니다! 👋";
      
      Alert.alert("성공", message, [{ 
        text: "확인", 
        onPress: () => {
          fetchLatestData(); // 데이터 갱신
        } 
      }]);

    } catch (e) {
      console.error(e);
      Alert.alert("오류", "전송 중 문제가 발생했습니다.");
    } finally {
      setIsLoading(false); // 로딩 끝
    }
  };

  // 버튼 클릭 핸들러
  const handleCheckInPress = () => {
    // ✅ 이미 완료했다면 아무것도 하지 않음 (더블 체크)
    if (isDoneToday) return;

    const method = userInfo.settings?.checkInMethod || '클릭';
    
    switch (method) {
      case '클릭': 
        completeCheckIn(null, '클릭'); 
        break;
      case '수학(EASY)': 
        math.generate('easy'); 
        break;
      case '수학(HARD)': 
        math.generate('hard'); 
        break;
      case '사진인증': 
        camera.open(); 
        break;
      case '흔들기': 
        shake.start(); 
        break;
      default: 
        completeCheckIn();
    }
  };

  // UI 아이콘 헬퍼 (완료 시 체크 아이콘)
  const getMethodIcon = () => {
    if (isDoneToday) return <CheckCircle size={64} color="#15803d" />; // ✅ 완료 아이콘

    const method = userInfo.settings?.checkInMethod || '클릭';
    switch (method) {
      case '수학(EASY)': 
      case '수학(HARD)': return <Calculator size={56} color="white" />;
      case '사진인증': return <Camera size={56} color="white" />;
      case '흔들기': return <Smartphone size={56} color="white" />;
      default: return <Heart size={64} color="white" fill="white" />;
    }
  };

  const getMethodLabel = () => {
    if (isDoneToday) return "오늘 안부 완료!"; // ✅ 완료 텍스트

    const method = userInfo.settings?.checkInMethod || '클릭';
    switch (method) {
      case '수학(EASY)': return "쉬운 계산 풀기";
      case '수학(HARD)': return "두뇌 튼튼 계산";
      case '사진인증': return "사진 찍어 보내기";
      case '흔들기': return "휴대폰 흔들기";
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
            disabled={isDoneToday || isLoading} // ✅ 완료 시 비활성화
          >
            {/* ✅ 완료 시: 초록색 그라디언트 / 미완료 시: 빨간색 그라디언트 */}
            <LinearGradient
              colors={isDoneToday ? ['#dcfce7', '#bbf7d0'] : ['#ef4444', '#f43f5e']}
              style={[
                styles.mainButton,
                isDoneToday && { borderWidth: 4, borderColor: '#86efac', elevation: 0 } // 완료 시 납작하게
              ]}
            >
              {isLoading ? <ActivityIndicator color="white" size="large" /> : getMethodIcon()}
            </LinearGradient>
            
            {/* 펄스 효과는 미완료일 때만 */}
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

            <TouchableOpacity 
              style={[styles.halfCard, !userInfo.is_premium && styles.disabledCard]} 
              onPress={() => {
                if (userInfo.is_premium) {
                  setShowFakeCall(true);
                } else {
                  Alert.alert("프리미엄 기능 🔒", "보호자가 프리미엄 회원이어야 사용할 수 있습니다.");
                }
              }}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.cardLabel, { color: '#ef4444' }]}>긴급 도구</Text>
              </View>
              <View style={styles.cardBody}>
                <View style={styles.iconCircle}>
                  <Text style={{fontSize: 24}}>📞</Text> 
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
      />

      <ShakeModal
        visible={shake.isVisible}
        progress={shake.progress}
        onCancel={shake.close}
        // ✅ 흔들기 완료 시 자동 실행되도록 ShakeModal 내부 로직이나 Hook에서 호출 필요
        // (여기서는 Hook의 onComplete prop 등을 활용하거나, useEffect 감지 방식 사용 권장)
      />

      <MemberSettingsModal 
        visible={showSettings}
        onClose={() => {
          setShowSettings(false);
          fetchLatestData();
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