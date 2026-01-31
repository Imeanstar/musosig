/**
 * MathChallengeModal.tsx (Enhanced)
 * - 수학 문제 풀이 모달
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity } from 'react-native';

interface MathChallengeModalProps {
  visible: boolean;
  n1: number;
  n2: number;
  userAnswer: string;
  onChangeAnswer: (text: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function MathChallengeModal({
  visible,
  n1,
  n2,
  userAnswer,
  onChangeAnswer,
  onConfirm,
  onCancel
}: MathChallengeModalProps) {
  
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>🧠 두뇌 튼튼 퀴즈</Text>
          <View style={styles.problemBox}>
            <Text style={styles.problemText}>{n1} + {n2} = ?</Text>
          </View>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            placeholder="정답"
            value={userAnswer}
            onChangeText={onChangeAnswer}
            maxLength={3}
            autoFocus
          />
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
              <Text style={styles.confirmText}>정답 확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  content: { width: '85%', backgroundColor: 'white', borderRadius: 24, padding: 32, alignItems: 'center', elevation: 5 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  problemBox: { backgroundColor: '#eff6ff', paddingVertical: 20, paddingHorizontal: 40, borderRadius: 16, marginBottom: 24 },
  problemText: { fontSize: 32, fontWeight: 'bold', color: '#3b82f6' },
  input: { width: '100%', borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 16, fontSize: 32, textAlign: 'center', paddingVertical: 12, marginBottom: 10, color: '#111827' },
  btnRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', marginTop: 20 },
  cancelBtn: { flex: 1, backgroundColor: '#f3f4f6', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginHorizontal: 6 },
  cancelText: { fontSize: 18, fontWeight: '600', color: '#4b5563' },
  confirmBtn: { flex: 1, backgroundColor: '#3b82f6', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginHorizontal: 6 },
  confirmText: { fontSize: 18, fontWeight: '600', color: 'white' },
});
