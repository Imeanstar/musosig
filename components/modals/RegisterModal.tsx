// components/modals/RegisterModal.tsx - 회원가입 모달 컴포넌트
import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { styles } from '../../styles/styles';

interface RegisterModalProps {
  visible: boolean;
  onRegister: (name: string, phone: string) => Promise<boolean>;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({ visible, onRegister }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = async () => {
    const success = await onRegister(name, phone);
    if (success) {
      // 성공 시 입력 필드 초기화
      setName('');
      setPhone('');
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>안부 - 시작하기</Text>
          <Text style={styles.modalSubtitle}>어르신의 정보를 입력해주세요.</Text>
          
          <Text style={styles.inputLabel}>이름</Text>
          <TextInput
            style={styles.input}
            placeholder="예: 홍길동"
            value={name}
            onChangeText={setName}
          />
          
          <Text style={styles.inputLabel}>전화번호</Text>
          <TextInput
            style={styles.input}
            placeholder="예: 010-1234-5678"
            value={phone}
            onChangeText={setPhone}
            keyboardType="number-pad"
          />
          
          <TouchableOpacity style={styles.registerButton} onPress={handleSubmit}>
            <Text style={styles.registerButtonText}>시작하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
