/**
 * ShakeModal.tsx
 * - 휴대폰 흔들기 진행 모달
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Smartphone } from 'lucide-react-native';

interface ShakeModalProps {
  visible: boolean;
  progress: number;
  onCancel: () => void;
}

export function ShakeModal({ visible, progress, onCancel }: ShakeModalProps) {
  
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>📱 휴대폰 흔들기</Text>
          <Text style={styles.desc}>게이지가 찰 때까지 폰을 흔들어주세요!</Text>
          
          <Smartphone size={80} color="#f43f5e" style={{ marginBottom: 20 }} />
          
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress}% 완료</Text>

          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>취소</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  content: { width: '85%', backgroundColor: 'white', borderRadius: 24, padding: 32, alignItems: 'center', elevation: 5 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  desc: { fontSize: 16, color: '#6b7280', marginBottom: 24, textAlign: 'center' },
  progressBg: { width: '100%', height: 20, backgroundColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#f43f5e' },
  progressText: { marginTop: 10, fontWeight: 'bold', color: '#f43f5e' },
  cancelBtn: { marginTop: 20, width: '100%', backgroundColor: '#f3f4f6', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  cancelText: { fontSize: 18, fontWeight: '600', color: '#4b5563' },
});
