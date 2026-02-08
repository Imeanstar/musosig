/**
 * components/modals/CustomAlertModal.tsx
 * * 예쁜 디자인의 커스텀 알림창
 * - type='danger'일 경우 버튼이 빨간색으로 변함 (삭제 등)
 * - 배경 클릭 시 닫힘 지원
 */

import React from 'react';
import { 
  Modal, View, Text, TouchableOpacity, StyleSheet, 
  TouchableWithoutFeedback 
} from 'react-native';

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  cancelText?: string;
  confirmText?: string;
  onClose: () => void;      // 취소/배경 클릭 시
  onConfirm: () => void;    // 확인 버튼 클릭 시
  type?: 'default' | 'danger'; // 위험한 액션(삭제)인지 여부
}

export default function CustomAlertModal({
  visible,
  title,
  message,
  cancelText = "취소",
  confirmText = "확인",
  onClose,
  onConfirm,
  type = 'default'
}: CustomAlertProps) {
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* 1. 배경 (누르면 닫힘) */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          
          {/* 2. 알림창 본문 (누르면 안 닫힘) */}
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.alertBox}>
              
              {/* 제목 & 내용 */}
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              {/* 버튼 영역 */}
              <View style={styles.buttonContainer}>
                {/* 취소 버튼 */}
                <TouchableOpacity 
                  style={[styles.button, styles.cancelButton]} 
                  onPress={onClose}
                >
                  <Text style={styles.cancelText}>{cancelText}</Text>
                </TouchableOpacity>

                {/* 확인 버튼 (Type에 따라 색상 변경) */}
                <TouchableOpacity 
                  style={[
                    styles.button, 
                    styles.confirmButton,
                    type === 'danger' && styles.dangerButton // 위험하면 빨간색
                  ]} 
                  onPress={() => {
                    onConfirm();
                    onClose(); // 확인 후 자동 닫기
                  }}
                >
                  <Text style={styles.confirmText}>{confirmText}</Text>
                </TouchableOpacity>
              </View>

            </View>
          </TouchableWithoutFeedback>

        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)', // 부드러운 반투명 배경
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBox: {
    width: '80%', // 화면의 80% 차지
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    alignItems: 'center', // 텍스트 중앙 정렬
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22, // 줄간격 살짝 줌
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 12, // 버튼 사이 간격
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  confirmButton: {
    backgroundColor: '#3b82f6', // 기본 파란색
  },
  dangerButton: {
    backgroundColor: '#ef4444', // 위험 빨간색
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});