import React, { useState } from 'react';
import { 
  Modal, View, Text, TextInput, TouchableOpacity, 
  StyleSheet, Alert, ActivityIndicator 
} from 'react-native';
import { X, Mail } from 'lucide-react-native';
import { supabase } from '@/lib/supabase'; // 본인 경로에 맞게 수정

interface PasswordResetModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PasswordResetModal({ visible, onClose }: PasswordResetModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendLink = async () => {
    if (!email.trim()) {
      Alert.alert('알림', '이메일을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      // Supabase 내장 기능: 비밀번호 재설정 메일 발송
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://example.com/update-password', // 웹에서 변경하도록 유도 (기본값)
      });

      if (error) throw error;

      Alert.alert(
        '메일 발송 성공 📩',
        '비밀번호 재설정 링크를 이메일로 보냈습니다.\n메일함을 확인하여 비밀번호를 변경해주세요.',
        [{ text: '확인', onPress: onClose }]
      );
      setEmail(''); // 입력창 초기화
    } catch (err: any) {
      Alert.alert('오류', '메일을 보내지 못했습니다.\n이메일 주소를 다시 확인해주세요.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>비밀번호 찾기</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <Text style={styles.desc}>
            가입하신 이메일 주소를 입력하시면,{'\n'}비밀번호 재설정 링크를 보내드립니다.
          </Text>

          <View style={styles.inputContainer}>
            <Mail size={20} color="#9ca3af" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="이메일 주소"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity 
            style={[styles.sendBtn, loading && styles.disabledBtn]} 
            onPress={handleSendLink}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.sendBtnText}>재설정 메일 보내기</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  content: { width: '85%', backgroundColor: 'white', borderRadius: 20, padding: 24, elevation: 5 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  closeBtn: { padding: 4 },
  desc: { color: '#6b7280', marginBottom: 20, lineHeight: 20 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 12, marginBottom: 20, borderWidth: 1, borderColor: '#e5e7eb' },
  icon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: '#1f2937' },
  sendBtn: { backgroundColor: '#3b82f6', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  disabledBtn: { backgroundColor: '#9ca3af' },
  sendBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});