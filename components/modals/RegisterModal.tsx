import React, { useState } from 'react';
import { 
  Modal, View, Text, TextInput, TouchableOpacity, 
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import { X } from 'lucide-react-native'; // 닫기 버튼용 아이콘

interface RegisterModalProps {
  visible: boolean;
  onRegister: (name: string, phone: string) => Promise<boolean>;
  onClose?: () => void; // 👈 [추가됨] 닫기 기능 (선택 사항)
}

export function RegisterModal({ visible, onRegister, onClose }: RegisterModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !phone.trim()) {
      alert('이름과 전화번호를 모두 입력해주세요.');
      return;
    }

    setIsLoading(true);
    const success = await onRegister(name, phone);
    setIsLoading(false);
    
    if (!success) {
      alert('로그인/가입에 실패했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose} // 안드로이드 뒤로가기 버튼 대응
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.modalContent}>
          
          {/* 👇 [추가됨] 닫기 버튼 (onClose가 있을 때만 표시) */}
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#9ca3af" />
            </TouchableOpacity>
          )}

          <Text style={styles.title}>환영합니다!</Text>
          <Text style={styles.subtitle}>
            서비스 이용을 위해{'\n'}간단한 정보를 입력해주세요.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>이름 (또는 닉네임)</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 김민성"
              value={name}
              onChangeText={setName}
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>전화번호</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 01012345678"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>시작하기</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  // 👇 [추가됨] 닫기 버튼 스타일
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#f9fafb',
  },
  button: {
    width: '100%',
    height: 54,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#93c5fd',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});