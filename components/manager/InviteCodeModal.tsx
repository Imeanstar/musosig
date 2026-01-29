/**
 * InviteCodeModal.tsx
 * 
 * 멤버 초대 코드 생성 및 표시 모달
 * - 초대 정보 입력
 * - 6자리 코드 생성
 * - 클립보드 복사
 * 
 * @extracted from ManagerMain.tsx (584-686줄)
 */

import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, 
  StyleSheet, Modal, ActivityIndicator 
} from 'react-native';
import { X, ArrowRight, Copy, RefreshCw } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

interface InviteCodeModalProps {
  visible: boolean;
  onClose: () => void;
  onGenerate: (nickname: string, relation: string) => Promise<string>;
  isLoading?: boolean;
}

export function InviteCodeModal({ 
  visible, 
  onClose, 
  onGenerate,
  isLoading = false 
}: InviteCodeModalProps) {
  const [step, setStep] = useState<'input' | 'show'>('input');
  const [nickname, setNickname] = useState('');
  const [relation, setRelation] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // 코드 복사
  const handleCopy = async () => {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // 코드 생성
  const handleGenerate = async () => {
    if (!nickname.trim() || !relation.trim()) return;
    
    const code = await onGenerate(nickname, relation);
    if (code) {
      setInviteCode(code);
      setStep('show');
    }
  };

  // 모달 닫기 및 초기화
  const handleClose = () => {
    setStep('input');
    setNickname('');
    setRelation('');
    setInviteCode('');
    setIsCopied(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.content}>
          
          {/* 닫기 버튼 */}
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <X size={24} color="#9ca3af" />
          </TouchableOpacity>

          <Text style={styles.title}>멤버 초대하기</Text>

          {/* Step 1: 정보 입력 */}
          {step === 'input' && (
            <View style={styles.inputContainer}>
              <Text style={styles.description}>
                초대할 가족의 정보를 입력해주세요.{'\n'}이 정보로 자동 가입됩니다.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>멤버 이름 (호칭)</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="예: 우리 엄마, 사랑하는 아들" 
                  value={nickname}
                  onChangeText={setNickname}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>나와의 관계</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="예: 부모님, 자녀" 
                  value={relation}
                  onChangeText={setRelation}
                />
              </View>

              <TouchableOpacity 
                style={[
                  styles.generateBtn,
                  (!nickname.trim() || !relation.trim() || isLoading) && styles.disabledBtn
                ]}
                onPress={handleGenerate}
                disabled={!nickname.trim() || !relation.trim() || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Text style={styles.generateBtnText}>초대 코드 만들기</Text>
                    <ArrowRight size={20} color="white" style={{ marginLeft: 8 }} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Step 2: 코드 표시 */}
          {step === 'show' && (
            <View style={styles.codeContainer}>
              <Text style={styles.description}>
                숫자 칸을 눌러 코드를 복사하고{'\n'}가족에게 전달해주세요.
              </Text>
              
              <View style={styles.codeRow}>
                <TouchableOpacity 
                  style={styles.codeBox} 
                  onPress={handleCopy}
                  activeOpacity={0.7}
                >
                  <Text style={styles.codeText}>{inviteCode}</Text>
                  <Copy size={16} color="#9ca3af" style={styles.copyIcon} />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleGenerate} style={styles.refreshBtn}>
                  <RefreshCw size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {isCopied ? (
                <Text style={styles.copiedMsg}>✅ 클립보드에 복사되었습니다!</Text>
              ) : (
                <Text style={styles.note}>* 코드는 10분 후 만료됩니다.</Text>
              )}
              
              <TouchableOpacity style={styles.confirmBtn} onPress={handleClose}>
                <Text style={styles.confirmBtnText}>확인 완료</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setStep('input')} style={styles.editBtn}>
                <Text style={styles.editBtnText}>정보 수정하기</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  content: { 
    backgroundColor: 'white', 
    width: '85%', 
    padding: 24, 
    borderRadius: 16, 
    alignItems: 'center', 
    elevation: 5 
  },
  closeBtn: { 
    position: 'absolute', 
    top: 16, 
    right: 16, 
    padding: 8 
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 8 
  },
  description: { 
    color: '#6b7280', 
    marginBottom: 20, 
    textAlign: 'center' 
  },

  // Input Step
  inputContainer: { width: '100%' },
  inputGroup: { width: '100%', marginBottom: 16 },
  label: { 
    fontSize: 14, 
    color: '#374151', 
    marginBottom: 6, 
    fontWeight: '600' 
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#e5e7eb', 
    borderRadius: 12, 
    padding: 14, 
    backgroundColor: '#f9fafb', 
    fontSize: 16 
  },
  generateBtn: { 
    width: '100%', 
    backgroundColor: '#3b82f6', 
    padding: 16, 
    borderRadius: 12, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 8,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  disabledBtn: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0
  },
  generateBtnText: { 
    color: 'white', 
    fontWeight: 'bold', 
    fontSize: 18 
  },

  // Code Step
  codeContainer: { width: '100%', alignItems: 'center' },
  codeRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 10 
  },
  codeBox: { 
    backgroundColor: '#eff6ff', 
    paddingVertical: 16, 
    paddingHorizontal: 24, 
    borderRadius: 12, 
    minWidth: 180, 
    alignItems: 'center', 
    marginRight: 10 
  },
  codeText: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: '#2563eb', 
    letterSpacing: 3 
  },
  copyIcon: { 
    position: 'absolute', 
    top: 8, 
    right: 8 
  },
  refreshBtn: { 
    padding: 12, 
    backgroundColor: '#f3f4f6', 
    borderRadius: 12 
  },
  copiedMsg: { 
    fontSize: 13, 
    color: '#10b981', 
    fontWeight: 'bold', 
    marginBottom: 20, 
    minHeight: 20 
  },
  note: { 
    fontSize: 12, 
    color: '#9ca3af', 
    marginBottom: 20, 
    minHeight: 20 
  },
  confirmBtn: { 
    width: '100%', 
    backgroundColor: '#3b82f6', 
    padding: 14, 
    borderRadius: 12, 
    alignItems: 'center' 
  },
  confirmBtnText: { 
    color: 'white', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  editBtn: { 
    marginTop: 16 
  },
  editBtnText: { 
    color: '#9ca3af', 
    textDecorationLine: 'underline' 
  },
});
