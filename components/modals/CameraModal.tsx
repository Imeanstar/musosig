/**
 * components/modals/CameraModal.tsx
 * - 사진 촬영 및 전송
 * - 📸 [추가됨] 전면/후면 카메라 전환 기능 (Selfie Mode)
 */
import React, { useState, useEffect } from 'react';
import { 
  Modal, View, TouchableOpacity, Text, StyleSheet, 
  ActivityIndicator, Image, SafeAreaView, Dimensions 
} from 'react-native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera'; // 👈 expo-camera 최신 버전 기준
import { X, Zap, ZapOff, RotateCcw, Send } from 'lucide-react-native'; // 아이콘 추가

interface CameraModalProps {
  visible: boolean;
  photoUri: string | null;
  cameraRef: React.RefObject<any>; // CameraView Ref
  onTakePicture: () => void;
  onRetake: () => void;
  onSend: () => void;
  onClose: () => void;
  isLoading: boolean;
}

const { width } = Dimensions.get('window');

export function CameraModal({ 
  visible, photoUri, cameraRef, 
  onTakePicture, onRetake, onSend, onClose, isLoading 
}: CameraModalProps) {
  
  // 1. 카메라 권한
  const [permission, requestPermission] = useCameraPermissions();
  
  // 2. 카메라 설정 상태 (전면/후면, 플래시)
  const [facing, setFacing] = useState<CameraType>('back'); // 'front' | 'back'
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (visible && !permission?.granted) {
      requestPermission();
    }
  }, [visible]);

  // 카메라 전환 함수
  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  // 플래시 전환 함수
  const toggleFlash = () => {
    setFlash(prev => !prev);
  };

  if (!permission) {
    return <View />; // 권한 로딩 중
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.centerContainer}>
          <Text style={styles.text}>카메라 권한이 필요합니다 😢</Text>
          <TouchableOpacity onPress={requestPermission} style={styles.btn}>
            <Text style={styles.btnText}>권한 허용하기</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={[styles.btn, { marginTop: 10, backgroundColor: '#9ca3af' }]}>
            <Text style={styles.btnText}>닫기</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        
        {photoUri ? (
          // ================= [미리보기 모드] =================
          <View style={styles.previewContainer}>
            <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="contain" />
            
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.retakeBtn} onPress={onRetake} disabled={isLoading}>
                <Text style={styles.retakeText}>다시 찍기</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sendBtn} onPress={onSend} disabled={isLoading}>
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Text style={styles.sendText}>전송하기</Text>
                    <Send size={20} color="white" style={{ marginLeft: 8 }} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // ================= [촬영 모드] =================
          <CameraView 
            style={styles.camera} 
            facing={facing} // 👈 전면/후면 설정
            enableTorch={flash} // 👈 플래시 설정 (안드로이드/iOS 호환성 체크 필요)
            ref={cameraRef}
          >
            {/* 상단 바 (닫기, 플래시) */}
            <View style={styles.topBar}>
              <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
                <X size={28} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity onPress={toggleFlash} style={styles.iconBtn}>
                {flash ? <Zap size={24} color="#fbbf24" /> : <ZapOff size={24} color="white" />}
              </TouchableOpacity>
            </View>

            {/* 하단 바 (셔터, 전환) */}
            <View style={styles.bottomBar}>
              <View style={{ flex: 1 }} /> {/* 왼쪽 여백 (균형 맞추기용) */}

              {/* 셔터 버튼 */}
              <TouchableOpacity onPress={onTakePicture} style={styles.shutterBtn}>
                <View style={styles.shutterInner} />
              </TouchableOpacity>

              {/* 카메라 전환 버튼 (오른쪽 배치) */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <TouchableOpacity onPress={toggleCameraFacing} style={styles.flipBtn}>
                  <RotateCcw size={28} color="white" />
                  <Text style={styles.flipText}>전환</Text>
                </TouchableOpacity>
              </View>
            </View>
          </CameraView>
        )}

      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  text: { fontSize: 18, marginBottom: 20, textAlign: 'center' },
  btn: { backgroundColor: '#3b82f6', padding: 15, borderRadius: 10 },
  btnText: { color: 'white', fontWeight: 'bold' },

  // 카메라 뷰
  camera: { flex: 1 },
  topBar: { 
    flexDirection: 'row', justifyContent: 'space-between', 
    padding: 20, paddingTop: 50 // 상단 여백
  },
  iconBtn: { 
    padding: 10, 
    backgroundColor: 'rgba(0,0,0,0.3)', 
    borderRadius: 20 
  },
  bottomBar: { 
    position: 'absolute', bottom: 40, left: 0, right: 0, 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 30
  },
  
  // 셔터 버튼 디자인
  shutterBtn: {
    width: 80, height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center', alignItems: 'center',
    elevation: 5
  },
  shutterInner: {
    width: 70, height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: 'black'
  },

  // 전환 버튼
  flipBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    width: 60, height: 60,
    borderRadius: 30
  },
  flipText: {
    color: 'white', fontSize: 10, marginTop: 4, fontWeight: 'bold'
  },

  // 미리보기 화면
  previewContainer: { flex: 1, backgroundColor: 'black', justifyContent: 'center' },
  previewImage: { width: '100%', height: '80%', borderRadius: 10 },
  actionButtons: { 
    flexDirection: 'row', justifyContent: 'space-around', 
    alignItems: 'center', padding: 20, position: 'absolute', bottom: 30, width: '100%' 
  },
  retakeBtn: { padding: 15 },
  retakeText: { color: 'white', fontSize: 18, fontWeight: '600' },
  sendBtn: { 
    backgroundColor: '#3b82f6', flexDirection: 'row', 
    paddingVertical: 14, paddingHorizontal: 30, borderRadius: 30,
    alignItems: 'center'
  },
  sendText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});