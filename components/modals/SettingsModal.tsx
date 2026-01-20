// components/modals/SettingsModal.tsx
import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { FileText, Lock } from 'lucide-react-native';
import { styles } from '../../styles/styles';
import { UserInfo, LegalDocType } from '../../types';
import { MAX_EMERGENCY_CONTACTS, MESSAGES } from '../../constants';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  userInfo: UserInfo;
  onSaveContacts: (contacts: string[]) => Promise<void>;
  // 🗑️ onTogglePremium 삭제됨
  onOpenLegal: (type: LegalDocType) => void;
  onReset: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  userInfo,
  onSaveContacts,
  // 🗑️ onTogglePremium 삭제됨
  onOpenLegal,
  onReset,
}) => {
  // 뒤에 || [] 를 붙여서, null이면 빈 배열로 바꿔줍니다.
const [emergencyContacts, setEmergencyContacts] = useState<string[]>(userInfo.emergency_contacts || []);
  const [newContact, setNewContact] = useState('');
  const [resetStep, setResetStep] = useState(0); // 0: 일반, 1: 초기화 확인

  const handleAddContact = () => {
    if (!newContact.trim()) return;
    if (emergencyContacts.length >= MAX_EMERGENCY_CONTACTS) {
      Alert.alert('알림', MESSAGES.CONTACTS_MAX_REACHED);
      return;
    }
    setEmergencyContacts([...emergencyContacts, newContact.trim()]);
    setNewContact('');
  };

  const handleRemoveContact = (index: number) => {
    setEmergencyContacts(emergencyContacts.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    await onSaveContacts(emergencyContacts);
    onClose();
    setResetStep(0);
  };

  const handleClose = () => {
    setEmergencyContacts(userInfo?.emergency_contacts || []);
    setResetStep(0);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.settingsModalContainer}>
          {resetStep === 0 ? (
            // 일반 설정 화면
            <>
              <Text style={styles.modalTitle}>설정</Text>

              {/* 🗑️ 프리미엄 스위치 UI 삭제됨 */}

              <Text style={styles.modalSubtitle}>비상연락망 관리 (최대 {MAX_EMERGENCY_CONTACTS}명)</Text>
              
              {/* 연락망 리스트 */}
              <ScrollView style={styles.contactsList}>
                {(emergencyContacts || []).map((contact, index) => (
                  <View key={index} style={styles.contactItem}>
                    <Text style={styles.contactText}>{contact}</Text>
                    <TouchableOpacity onPress={() => handleRemoveContact(index)}>
                      <Text style={styles.removeButton}>삭제</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>

              {/* 연락망 추가 */}
              {emergencyContacts.length < MAX_EMERGENCY_CONTACTS && (
                <View style={styles.addContactRow}>
                  <TextInput
                    style={[styles.input, styles.addContactInput]}
                    placeholder="보호자 전화번호"
                    value={newContact}
                    onChangeText={setNewContact}
                    keyboardType="number-pad"
                  />
                  <TouchableOpacity style={styles.addButton} onPress={handleAddContact}>
                    <Text style={styles.addButtonText}>추가</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 저장/닫기 버튼 */}
              <View style={styles.settingsModalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={handleClose}
                >
                  <Text style={styles.cancelButtonText}>닫기</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSave}
                >
                  <Text style={styles.saveButtonText}>저장</Text>
                </TouchableOpacity>
              </View>

              {/* 법률 문서 메뉴 */}
              <View style={styles.legalMenuSection}>
                <TouchableOpacity
                  style={styles.legalMenuItem}
                  onPress={() => onOpenLegal('terms')}
                >
                  <FileText size={20} color="#374151" />
                  <Text style={styles.legalMenuText}>📄 이용약관</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.legalMenuItem}
                  onPress={() => onOpenLegal('privacy')}
                >
                  <Lock size={20} color="#374151" />
                  <Text style={styles.legalMenuText}>🔒 개인정보처리방침</Text>
                </TouchableOpacity>
              </View>

              {/* 초기화 버튼 */}
              <TouchableOpacity style={styles.resetButton} onPress={() => setResetStep(1)}>
                <Text style={styles.resetButtonText}>데이터 초기화 (처음으로)</Text>
              </TouchableOpacity>
            </>
          ) : (
            // 초기화 확인 화면 (유지)
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Text style={[styles.modalTitle, { color: '#ef4444' }]}>{MESSAGES.RESET_CONFIRM_TITLE}</Text>
              <Text style={[styles.modalSubtitle, { marginBottom: 30 }]}>
                {MESSAGES.RESET_CONFIRM_MESSAGE}
              </Text>
              <View style={styles.settingsModalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setResetStep(0)}
                >
                  <Text style={styles.cancelButtonText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#ef4444' }]}
                  onPress={onReset}
                >
                  <Text style={[styles.saveButtonText, { fontWeight: '900' }]}>네, 초기화합니다</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};