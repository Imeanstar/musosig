/**
 * MemberMain.tsx
 * - 피보호자용 메인 화면 (Full Feature)
 * - 기능: 클릭, 수학, 사진(Camera), 흔들기(Sensor) 완벽 구현
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator, Image 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, Calculator, Camera, Smartphone, CheckCircle, RefreshCw, LogOut, X, RotateCcw, Send } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { UserInfo } from '../types';
import { Settings } from 'lucide-react-native';
import { MemberSettingsModal } from './modals/MemberSettingsModal';

// 📦 하드웨어 라이브러리
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Accelerometer } from 'expo-sensors';

// 상단 import 목록에 추가
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system'; // Expo 기본 내장 모듈
import { FakeCallModal } from './modals/FakeCallModal';

interface MemberMainProps {
  userInfo: UserInfo;
  onBack: () => void; // 로그아웃용
}

export function MemberMain({ userInfo: initialUserInfo, onBack }: MemberMainProps) {
  const insets = useSafeAreaInsets();
  
  // --- 상태 관리 ---
  const [userInfo, setUserInfo] = useState<UserInfo>(initialUserInfo);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // 1. 수학 문제 상태
  const [showMathModal, setShowMathModal] = useState(false);
  const [mathProblem, setMathProblem] = useState({ n1: 0, n2: 0, ans: 0 });
  const [userAnswer, setUserAnswer] = useState('');

  // 2. 카메라 상태
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const cameraRef = useRef<any>(null);

  // 3. 흔들기 상태
  const [showShakeModal, setShowShakeModal] = useState(false);
  const [shakeProgress, setShakeProgress] = useState(0);
  const [subscription, setSubscription] = useState<any>(null);

  const [showFakeCall, setShowFakeCall] = useState(false);


  // 🔄 최신 설정 불러오기
  // MemberMain.tsx 내부
  console.log("🎨 [Member] 화면 렌더링 중 - 현재 userInfo.is_premium:", userInfo.is_premium);
  // MemberMain.tsx 내부의 fetchLatestData 함수 교체

  const fetchLatestData = async () => {
    try {
      console.log("🔄 [Member] 연결된 매니저의 등급 확인 중..."); 
      setIsRefreshing(true);

      // 1. 내 정보 가져오기
      const { data: myData, error: myError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userInfo.id)
        .single();

        if (myError || !myData) {
          console.error("❌ 내 정보 조회 실패:", myError);
          return;
        }
    
        // 🕵️‍♂️ [범인 추적] 여기서 값이 제대로 찍히는지 확인하세요!
        console.log("📅 [DEBUG] DB에서 가져온 last_seen_at:", myData.last_seen_at);

      let isManagerPremium = false;

      // 2. 나랑 연결된 매니저(manager_id)가 있다면, 그 사람의 등급 확인
      if (myData.manager_id) {
        const { data: managerData, error: managerError } = await supabase
          .from('users')
          .select('is_premium')
          .eq('id', myData.manager_id)
          .single();

        if (managerData) {
          isManagerPremium = managerData.is_premium;
          console.log(`👨‍👩‍👧 매니저(${myData.manager_id.slice(0,4)}..)의 프리미엄 상태:`, isManagerPremium);
        }
      } else {
        console.log("⚠️ 연결된 매니저가 없습니다.");
      }

      // 3. [핵심] 내 등급(본인결제) OR 매니저 등급(가족결합) 둘 중 하나라도 true면 프리미엄!
      const effectivePremiumStatus = myData.is_premium || isManagerPremium;

      console.log("👑 최종 적용될 프리미엄 상태:", effectivePremiumStatus);

      // 4. 상태 업데이트 (화면에는 합쳐진 결과로 반영됨)
      setUserInfo({
        ...myData,
        is_premium: effectivePremiumStatus // 여기서 덮어씌웁니다!
      });

    } catch (e) {
      console.error("데이터 갱신 실패:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLatestData();
    // 컴포넌트 언마운트 시 센서 끄기 (안전장치)
    return () => _unsubscribe();
  }, []);

  // 📤 사진 업로드 함수 (ArrayBuffer 방식 - 네트워크 에러 해결판)
  const uploadImage = async (uri: string) => {
    try {
      // 1. 파일 확장자 추출
      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${userInfo.id}/${Date.now()}.${ext}`;

      // 2. 파일을 base64 문자열로 읽기 (Expo FileSystem 사용)
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // 3. ArrayBuffer로 변환 후 업로드
      // (contentType을 명시해야 미리보기가 잘 나옵니다)
      const { data, error } = await supabase.storage
        .from('proof_shots')
        .upload(fileName, decode(base64), {
          contentType: `image/jpeg`,
          upsert: false
        });

      if (error) throw error;

      // 4. 공개 URL 받아오기
      const { data: { publicUrl } } = supabase.storage
        .from('proof_shots')
        .getPublicUrl(fileName);

      console.log("✅ 생성된 URL:", publicUrl); // 로그로 확인해보세요!
      return publicUrl;

    } catch (e) {
      console.error("Upload failed:", e);
      throw e; 
    }
  };

  // ✅ 생존 신고 성공 처리 (출석 방식 기록 추가)
  // type 인자를 받아서 DB에 같이 저장합니다.
  // 🔍 디버깅용 completeCheckIn
  const completeCheckIn = async (imageUri?: string | null, type: string = '클릭') => {
    try {
      setIsLoading(true);
      const now = new Date();
      let uploadedUrl = null;

      // 🕵️‍♂️ [추적 1] 이미지 URI가 들어왔는지 확인
      console.log("1. 받은 이미지 URI:", imageUri);

      if (imageUri) {
        uploadedUrl = await uploadImage(imageUri);
        // 🕵️‍♂️ [추적 2] 업로드 함수가 URL을 뱉었는지 확인
        console.log("2. 반환받은 URL:", uploadedUrl); 
      }

      // (1) Users 테이블 업데이트
      const { error: userError } = await supabase
        .from('users')
        .update({ 
          last_seen_at: now.toISOString(),
          last_proof_url: uploadedUrl, 
          updated_at: now.toISOString()
        })
        .eq('id', userInfo.id);

      if (userError) throw userError;

      // 🕵️‍♂️ [추적 3] DB에 넣기 직전 데이터 확인
      console.log("3. DB 저장 시도 -> 타입:", type, "URL:", uploadedUrl);

      // (2) Insert Log
      const { error: logError } = await supabase
        .from('check_in_logs')
        .insert({ 
          member_id: userInfo.id,
          check_in_type: type,
          proof_url: uploadedUrl 
        });

      if (logError) console.log("Log error:", logError.message);

      // (3) 정리 및 피드백
      if (typeof _unsubscribe === 'function') _unsubscribe(); 
      setShowMathModal(false);
      setShowCameraModal(false);
      setShowShakeModal(false);
      setShakeProgress(0);
      setPhotoUri(null);

      const message = uploadedUrl 
        ? "사진과 함께 안부를 전했습니다! 📸" 
        : "보호자에게 안부를 전했습니다! 👋";

      Alert.alert("성공", message, [{ text: "확인", onPress: fetchLatestData }]);

    } catch (e: any) {
      console.error(e);
      Alert.alert("오류", "전송 중 문제가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 🚀 인증 방식 라우터
  const handleCheckInPress = () => {
    const method = userInfo.settings?.checkInMethod || '클릭';

    switch (method) {
      case '클릭': completeCheckIn(null, '클릭'); break; // type 전달
      case '수학(EASY)':
        generateMathProblem('easy');
        setShowMathModal(true);
        break;
      case '수학(HARD)':
        generateMathProblem('hard');
        setShowMathModal(true);
        break;
      case '사진인증':
        openCamera();
        break;
      case '흔들기':
        startShakeDetection();
        break;
      default:
        completeCheckIn();
    }
  };

  // ---------------------------------------------------------
  // 🧮 기능 1: 수학 문제
  // ---------------------------------------------------------
  const generateMathProblem = (difficulty: 'easy' | 'hard') => {
    let n1, n2;
    if (difficulty === 'easy') {
      n1 = Math.floor(Math.random() * 9) + 1; 
      n2 = Math.floor(Math.random() * 9) + 1;
    } else {
      n1 = Math.floor(Math.random() * 40) + 10;
      n2 = Math.floor(Math.random() * 40) + 10;
    }
    setMathProblem({ n1, n2, ans: n1 + n2 });
    setUserAnswer('');
  };

  const checkMathAnswer = () => {
    if (parseInt(userAnswer) === mathProblem.ans) {
      completeCheckIn(null, '수학 문제');
    } else {
      Alert.alert("땡!", "다시 한번 천천히 계산해보세요. 할 수 있어요! 💪");
      setUserAnswer('');
    }
  };

  // ---------------------------------------------------------
  // 📸 기능 2: 카메라
  // ---------------------------------------------------------
  const openCamera = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert("권한 필요", "사진을 찍으려면 카메라 권한이 필요합니다.");
        return;
      }
    }
    setPhotoUri(null);
    setShowCameraModal(true);
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.4, // 🔥 화질 40%로 압축 (용량 대폭 감소)
        skipProcessing: true, // 안드로이드 처리 속도 개선
      });
      setPhotoUri(photo.uri);
    }
  };

  // ---------------------------------------------------------
  // 👋 기능 3: 흔들기 (가속도계)
  // ---------------------------------------------------------
  const startShakeDetection = () => {
    setShakeProgress(0);
    setShowShakeModal(true);
    _subscribe();
  };

  const _subscribe = () => {
    setSubscription(
      Accelerometer.addListener(accelerometerData => {
        const { x, y, z } = accelerometerData;
        // 흔들림 강도 계산 (벡터 크기)
        const magnitude = Math.sqrt(x * x + y * y + z * z);
        
        // 민감도 조절 (1.5G 이상일 때 흔들림으로 간주)
        if (magnitude > 1.5) {
          setShakeProgress(prev => {
            const next = prev + 4; // 흔들 때마다 4%씩 증가
            if (next >= 100) {
              _unsubscribe();
              completeCheckIn(null, '흔들기');
              return 100;
            }
            return next;
          });
        }
      })
    );
    Accelerometer.setUpdateInterval(100); // 0.1초마다 체크
  };

  const _unsubscribe = () => {
    subscription && subscription.remove();
    setSubscription(null);
  };

  // ---------------------------------------------------------
  // UI Helpers
  // ---------------------------------------------------------
  const getMethodIcon = () => {
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

        {/* ⚙️ 설정 버튼 */}
        <TouchableOpacity 
          style={styles.settingsBtn} 
          onPress={() => setShowSettings(true)}
        >
          <Settings size={24} color="#4b5563" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        
        <View style={styles.infoRow}>
          <Text style={styles.subGreeting}>
            오늘도 무소식과 함께{'\n'}활기찬 하루 보내세요!
          </Text>
          <TouchableOpacity onPress={onBack} style={styles.miniLogoutBtn}>
            <LogOut size={16} color="#6b7280" />
            <Text style={styles.miniLogoutText}>로그아웃</Text>
          </TouchableOpacity>
        </View>

        {/* 메인 버튼 */}
        <View style={styles.centerArea}>
          <TouchableOpacity 
            style={styles.mainButtonContainer} 
            onPress={handleCheckInPress}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#ef4444', '#f43f5e']} 
              style={styles.mainButton}
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="large" />
              ) : (
                getMethodIcon()
              )}
            </LinearGradient>
            <View style={styles.pulseRing} /> 
          </TouchableOpacity>
          <Text style={styles.actionLabel}>{getMethodLabel()}</Text>
          <Text style={styles.actionSubLabel}>버튼을 눌러 안부를 전해주세요</Text>
        </View>

        {/* 하단 영역: (좌) 마지막 안부 / (우) 페이크 콜 */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.bottomRow}>
            
            {/* (좌) 상태 카드: 마지막 안부 */}
            <TouchableOpacity 
              style={styles.halfCard} 
              onPress={fetchLatestData}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <RefreshCw size={14} color="#9ca3af" />
                <Text style={styles.cardLabel}>마지막 안부</Text>
              </View>
              <View style={styles.cardBody}>
                <CheckCircle size={24} color="#10b981" style={{ marginBottom: 8 }} />
                <Text style={styles.cardValueText} numberOfLines={2}>
                  {userInfo.last_seen_at 
                    ? new Date(userInfo.last_seen_at).toLocaleTimeString('ko-KR', {
                        hour: '2-digit', minute: '2-digit'
                      })
                    : '-'}
                </Text>
                <Text style={styles.cardDateText}>
                  {userInfo.last_seen_at 
                    ? new Date(userInfo.last_seen_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
                    : '기록 없음'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* (우) 기능 카드: 페이크 콜 */}
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
                {/* 아이콘 */}
                <View style={styles.iconCircle}>
                  {/* Phone 아이콘이 없으면 아래 텍스트로 대체됨 */}
                  <Text style={{fontSize: 24}}>📞</Text> 
                </View>
                <Text style={styles.cardValueText}>페이크 콜</Text>
                <Text style={styles.cardDateText}>가짜 전화 걸기</Text>
              </View>

              {/* 프리미엄 잠금 오버레이 */}
              {!userInfo.is_premium && (
                <View style={styles.lockOverlay}>
                  <Text style={{ fontSize: 24 }}>🔒</Text>
                  <Text style={styles.lockText}>Premium</Text>
                </View>
              )}
            </TouchableOpacity>
          
          </View>
        </View>

        {/* (맨 아래 모달들 모여있는 곳에 이것도 추가해주세요!) */}
        <FakeCallModal 
          visible={showFakeCall} 
          onClose={() => setShowFakeCall(false)} 
          callerName="우리 아빠 ❤️" 
        />
      </View>

      {/* ================= MODAL 1: 수학 문제 ================= */}
      <Modal visible={showMathModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🧠 두뇌 튼튼 퀴즈</Text>
            <View style={styles.problemBox}>
              <Text style={styles.problemText}>{mathProblem.n1} + {mathProblem.n2} = ?</Text>
            </View>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              placeholder="정답"
              value={userAnswer}
              onChangeText={setUserAnswer}
              maxLength={3}
              autoFocus
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowMathModal(false)}>
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={checkMathAnswer}>
                <Text style={styles.confirmBtnText}>정답 확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL 2: 카메라 ================= */}
      <Modal visible={showCameraModal} animationType="slide">
        <View style={styles.cameraContainer}>
          
          {/* 👇 [조건문] photoUri가 없으면 카메라, 있으면 미리보기 */}
          {!photoUri ? (
            // ---------------- [1] 카메라 촬영 화면 ----------------
            <CameraView style={{ flex: 1 }} ref={cameraRef} facing="back">
              <View style={styles.cameraOverlay}>
                <TouchableOpacity style={styles.closeCameraBtn} onPress={() => setShowCameraModal(false)}>
                  <X size={32} color="white" />
                </TouchableOpacity>
                <View style={styles.shutterContainer}>
                  <TouchableOpacity style={styles.shutterBtn} onPress={takePicture}>
                    <View style={styles.shutterInner} />
                  </TouchableOpacity>
                  <Text style={{ color: 'white', marginTop: 10 }}>사진을 찍어주세요</Text>
                </View>
              </View>
            </CameraView>
          ) : (
            // ---------------- [2] 찍은 사진 미리보기 화면 ----------------
            <View style={{ flex: 1, backgroundColor: 'black' }}>
              {/* 찍은 사진 보여주기 */}
              <Image source={{ uri: photoUri }} style={{ flex: 1 }} resizeMode="contain" />
              
              <View style={styles.previewOverlay}>
                <Text style={styles.previewTitle}>이 사진으로 보낼까요?</Text>
                <View style={styles.modalBtnRow}>
                  {/* 재촬영 버튼 */}
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setPhotoUri(null)}>
                    <RotateCcw size={20} color="#4b5563" />
                    <Text style={[styles.cancelBtnText, { marginLeft: 6 }]}>재촬영</Text>
                  </TouchableOpacity>
                  
                  {/* 전송하기 버튼 */}
                  <TouchableOpacity 
                    style={styles.confirmBtn} 
                    onPress={() => {
                      console.log("🔘 [UI] 전송 버튼 클릭! URI:", photoUri); 
                      completeCheckIn(photoUri, '사진 인증');
                    }}
                  >
                    <Send size={20} color="white" />
                    <Text style={[styles.confirmBtnText, { marginLeft: 6 }]}>전송하기</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* ================= MODAL 3: 흔들기 ================= */}
      <Modal visible={showShakeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📱 휴대폰 흔들기</Text>
            <Text style={styles.modalDesc}>게이지가 찰 때까지 폰을 흔들어주세요!</Text>
            
            <Smartphone size={80} color="#f43f5e" style={{ marginBottom: 20 }} />
            
            {/* 프로그래스 바 */}
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${shakeProgress}%` }]} />
            </View>
            <Text style={{ marginTop: 10, fontWeight: 'bold', color: '#f43f5e' }}>
              {shakeProgress}% 완료
            </Text>

            <TouchableOpacity 
              style={[styles.cancelBtn, { marginTop: 20, width: '100%' }]} 
              onPress={() => { setShowShakeModal(false); _unsubscribe(); }}
            >
              <Text style={styles.cancelBtnText}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <MemberSettingsModal 
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        onLogout={() => {
          setShowSettings(false); // 모달 끄고
          onBack(); // 로그아웃 실행 (부모에게 전달)
        }}
      />
      
      {/* 페이크 콜 모달은 이제 '이름'을 prop으로 넘길 필요가 없어짐 (내부에서 알아서 가져옴) */}
      <FakeCallModal 
        visible={showFakeCall} 
        onClose={() => setShowFakeCall(false)} 
        // callerName prop 제거 (설정값 우선)
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },

  // 상단 바
  topBar: {
    backgroundColor: 'white', paddingHorizontal: 24, paddingBottom: 20,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, zIndex: 10,
  },
  topBarGreeting: { fontSize: 16, color: '#6b7280', marginBottom: 2 },
  topBarName: { fontSize: 24, fontWeight: 'bold', color: '#111827' },

  content: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  subGreeting: { fontSize: 16, color: '#4b5563', lineHeight: 24, flex: 1 },
  miniLogoutBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', 
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, marginLeft: 10,
  },
  miniLogoutText: { fontSize: 12, color: '#6b7280', marginLeft: 4, fontWeight: '600' },

  // 중앙 버튼
  centerArea: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  mainButtonContainer: {
    width: 200, height: 200, justifyContent: 'center', alignItems: 'center', marginBottom: 24, position: 'relative'
  },
  mainButton: {
    width: 180, height: 180, borderRadius: 90, justifyContent: 'center', alignItems: 'center',
    elevation: 10, shadowColor: '#ef4444', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, zIndex: 2,
  },
  pulseRing: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    borderWidth: 2, borderColor: '#fca5a5', opacity: 0.5, zIndex: 1
  },
  actionLabel: { fontSize: 28, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  actionSubLabel: { fontSize: 16, color: '#6b7280' },

  // 하단
  footer: { },
  // styles 객체 안에 추가

  // 하단 2분할 레이아웃
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12, // 카드 사이 간격
  },
  halfCard: {
    flex: 1, // 반반 차지
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    height: 140, // 높이 고정 (균형 맞추기)
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    justifyContent: 'space-between'
  },
  disabledCard: {
    backgroundColor: '#f3f4f6', // 비활성화 시 회색
    opacity: 0.9
  },
  
  // 카드 내부 요소
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  cardLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
    fontWeight: '600'
  },
  cardBody: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  cardValueText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2
  },
  cardDateText: {
    fontSize: 12,
    color: '#9ca3af'
  },
  iconCircle: {
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#fee2e2', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 8
  },

  // 잠금 오버레이
  lockOverlay: {
    ...StyleSheet.absoluteFillObject, // 카드 꽉 채우기
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  lockText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6b7280',
    marginTop: 4
  },
  statusTitle: { fontSize: 14, color: '#6b7280' },
  statusRow: { alignItems: 'flex-end' },
  lastSeenText: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginLeft: 6 },

  // 공통 모달
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: 'white', borderRadius: 24, padding: 32, alignItems: 'center', elevation: 5 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  modalDesc: { fontSize: 16, color: '#6b7280', marginBottom: 24, textAlign: 'center' },
  modalBtnRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', marginTop: 20 },
  
  cancelBtn: { flex: 1, backgroundColor: '#f3f4f6', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginHorizontal: 6, flexDirection: 'row', justifyContent: 'center' },
  cancelBtnText: { fontSize: 18, fontWeight: '600', color: '#4b5563' },
  confirmBtn: { flex: 1, backgroundColor: '#3b82f6', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginHorizontal: 6, flexDirection: 'row', justifyContent: 'center' },
  confirmBtnText: { fontSize: 18, fontWeight: '600', color: 'white' },

  // 수학 모달
  problemBox: { backgroundColor: '#eff6ff', paddingVertical: 20, paddingHorizontal: 40, borderRadius: 16, marginBottom: 24 },
  problemText: { fontSize:32, fontWeight: 'bold', color: '#3b82f6' },
  input: { width: '100%', borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 16, fontSize: 32, textAlign: 'center', paddingVertical: 12, marginBottom: 10, color: '#111827' },

  // 카메라 모달
  cameraContainer: { flex: 1, backgroundColor: 'black' },
  cameraOverlay: { flex: 1, justifyContent: 'space-between', padding: 30, paddingBottom: 50 },
  closeCameraBtn: { alignSelf: 'flex-end', padding: 10, marginTop: 40 },
  shutterContainer: { alignItems: 'center' },
  shutterBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },
  shutterInner: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: 'black' },
  
  previewOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.7)', padding: 30, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  previewTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },

  // 흔들기 모달
  progressBarBg: { width: '100%', height: 20, backgroundColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#f43f5e' },
  settingsBtn: {
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 20,
    elevation: 2, // 그림자
  },
});