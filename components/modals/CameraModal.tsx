/**
 * CameraModal.tsx
 * - 카메라 촬영 및 미리보기 모달
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image } from 'react-native';
import { X, RotateCcw, Send } from 'lucide-react-native';
import { CameraView } from 'expo-camera';

interface CameraModalProps {
  visible: boolean;
  photoUri: string | null;
  cameraRef: React.RefObject<any>;
  onTakePicture: () => void;
  onRetake: () => void;
  onSend: () => void;
  onClose: () => void;
}

export function CameraModal({
  visible,
  photoUri,
  cameraRef,
  onTakePicture,
  onRetake,
  onSend,
  onClose
}: CameraModalProps) {
  
  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        {!photoUri ? (
          // 촬영 화면
          <CameraView style={{ flex: 1 }} ref={cameraRef} facing="back">
            <View style={styles.overlay}>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <X size={32} color="white" />
              </TouchableOpacity>
              <View style={styles.shutterContainer}>
                <TouchableOpacity style={styles.shutterBtn} onPress={onTakePicture}>
                  <View style={styles.shutterInner} />
                </TouchableOpacity>
                <Text style={styles.hint}>사진을 찍어주세요</Text>
              </View>
            </View>
          </CameraView>
        ) : (
          // 미리보기 화면
          <View style={{ flex: 1, backgroundColor: 'black' }}>
            <Image source={{ uri: photoUri }} style={{ flex: 1 }} resizeMode="contain" />
            <View style={styles.previewOverlay}>
              <Text style={styles.previewTitle}>이 사진으로 보낼까요?</Text>
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.retakeBtn} onPress={onRetake}>
                  <RotateCcw size={20} color="#4b5563" />
                  <Text style={styles.retakeText}>재촬영</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sendBtn} onPress={onSend}>
                  <Send size={20} color="white" />
                  <Text style={styles.sendText}>전송하기</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  overlay: { flex: 1, justifyContent: 'space-between', padding: 30, paddingBottom: 50 },
  closeBtn: { alignSelf: 'flex-end', padding: 10, marginTop: 40 },
  shutterContainer: { alignItems: 'center' },
  shutterBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },
  shutterInner: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: 'black' },
  hint: { color: 'white', marginTop: 10 },
  previewOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.7)', padding: 30, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  previewTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  btnRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', marginTop: 20 },
  retakeBtn: { flex: 1, backgroundColor: '#f3f4f6', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginHorizontal: 6, flexDirection: 'row', justifyContent: 'center' },
  retakeText: { fontSize: 18, fontWeight: '600', color: '#4b5563', marginLeft: 6 },
  sendBtn: { flex: 1, backgroundColor: '#3b82f6', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginHorizontal: 6, flexDirection: 'row', justifyContent: 'center' },
  sendText: { fontSize: 18, fontWeight: '600', color: 'white', marginLeft: 6 },
});
