import React, { useState } from 'react'; // useState 추가
import { View, Text, Modal, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { X, Copy, RefreshCw, Check } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { Alert } from 'react-native';

interface RelinkCodeModalProps {
  visible: boolean;
  code: string | null;
  memberName: string;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

export function RelinkCodeModal({ visible, code, memberName, onClose }: RelinkCodeModalProps) {
    const [isCopied, setIsCopied] = useState(false);
    const handleCopy = async () => {
    if (code) {
      await Clipboard.setStringAsync(code); 
      setIsCopied(true);
      // 2초 뒤에 원래대로 복구
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.title}>재연결 코드 발급</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* 내용 */}
          <View style={styles.content}>
            <View style={styles.iconCircle}>
              <RefreshCw size={32} color="#fff" />
            </View>
            
            <Text style={styles.desc}>
              <Text style={styles.bold}>{memberName}</Text> 님을 위한{'\n'}
              새로운 연결 코드입니다.
            </Text>

            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{code || '생성 중...'}</Text>
            </View>

            <Text style={styles.subDesc}>
              이 코드를 멤버의 기기에서 입력해주세요.{'\n'}
              (기존 데이터가 자동으로 복구됩니다)
            </Text>

            <TouchableOpacity 
              style={[
                styles.copyButton, 
                isCopied && { backgroundColor: '#10b981' } // ✅ 복사되면 초록색으로 변경
              ]} 
              onPress={handleCopy}
              disabled={isCopied} // 중복 클릭 방지
            >
              {isCopied ? (
                // ✅ 복사 완료 시 보여줄 UI
                <>
                  <Check size={20} color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.copyText}>복사 완료!</Text>
                </>
              ) : (
                // 🔘 평소 UI
                <>
                  <Copy size={20} color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.copyText}>코드 복사하기</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: width * 0.85, backgroundColor: 'white', borderRadius: 20, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  content: { padding: 24, alignItems: 'center' },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  desc: { fontSize: 16, color: '#4b5563', textAlign: 'center', marginBottom: 20, lineHeight: 24 },
  bold: { fontWeight: 'bold', color: '#1f2937' },
  codeBox: { backgroundColor: '#f3f4f6', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb', width: '100%', alignItems: 'center' },
  codeText: { fontSize: 28, fontWeight: 'bold', color: '#3b82f6', letterSpacing: 4 },
  subDesc: { fontSize: 13, color: '#9ca3af', textAlign: 'center', marginBottom: 24 },
  copyButton: { flexDirection: 'row', backgroundColor: '#1f2937', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, width: '100%', justifyContent: 'center', alignItems: 'center' },
  copyText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});