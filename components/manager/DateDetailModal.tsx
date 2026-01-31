/**
 * DateDetailModal.tsx
 * - 캘린더 날짜 클릭 시 출석 상세 정보 표시
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image } from 'react-native';
import { X, CheckCircle, XCircle, Camera } from 'lucide-react-native';

interface DateDetailModalProps {
  visible: boolean;
  onClose: () => void;
  date: string;
  log: any | null;
  showPhoto: boolean;
  onTogglePhoto: () => void;
}

export function DateDetailModal({
  visible,
  onClose,
  date,
  log,
  showPhoto,
  onTogglePhoto
}: DateDetailModalProps) {
  
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          
          {/* 닫기 버튼 */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={24} color="#6b7280" />
          </TouchableOpacity>

          <Text style={styles.title}>{date} 기록</Text>

          {log ? (
            // ✅ 출석한 날
            <View style={styles.content}>
              <CheckCircle size={48} color="#10b981" style={{ marginBottom: 12 }} />
              <Text style={styles.titleGreen}>출석 완료!</Text>
              
              <Text style={styles.desc}>
                "{log.check_in_type || '터치'}"(으)로{'\n'}출석한 날입니다.
              </Text>

              {/* 사진 인증 */}
              {log.proof_url && (
                <View style={styles.photoSection}>
                  {!showPhoto ? (
                    <TouchableOpacity style={styles.photoBtn} onPress={onTogglePhoto}>
                      <Camera size={20} color="#4b5563" style={{ marginRight: 8 }} />
                      <Text style={styles.photoBtnText}>인증 사진 확인하기</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.photoContainer}>
                      <Image 
                        source={{ uri: log.proof_url }} 
                        style={styles.photo}
                        resizeMode="cover"
                      />
                    </View>
                  )}
                </View>
              )}
            </View>
          ) : (
            // ❌ 결석한 날
            <View style={styles.content}>
              <XCircle size={48} color="#ef4444" style={{ marginBottom: 12 }} />
              <Text style={styles.titleRed}>미출석</Text>
              <Text style={styles.desc}>출석하지 않은 날입니다.</Text>
              <Text style={styles.subdesc}>전화로 안부를 물어보세요.</Text>
            </View>
          )}

          <TouchableOpacity style={styles.confirmBtn} onPress={onClose}>
            <Text style={styles.confirmBtnText}>닫기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', alignItems: 'center' 
  },
  card: { 
    width: '85%', backgroundColor: 'white', borderRadius: 20, 
    padding: 24, alignItems: 'center', elevation: 5 
  },
  closeBtn: { position: 'absolute', top: 16, right: 16, padding: 4 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#374151', marginBottom: 20 },
  content: { alignItems: 'center', width: '100%' },
  titleGreen: { fontSize: 22, fontWeight: 'bold', color: '#10b981', marginBottom: 8 },
  titleRed: { fontSize: 22, fontWeight: 'bold', color: '#ef4444', marginBottom: 8 },
  desc: { fontSize: 16, color: '#4b5563', textAlign: 'center', lineHeight: 24 },
  subdesc: { fontSize: 14, color: '#9ca3af', marginTop: 4 },
  
  photoSection: { marginTop: 16, width: '100%', alignItems: 'center' },
  photoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f3f4f6', paddingVertical: 12, paddingHorizontal: 20,
    borderRadius: 12, width: '100%', borderWidth: 1, borderColor: '#e5e7eb'
  },
  photoBtnText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  photoContainer: { marginTop: 16, width: '100%', alignItems: 'center' },
  photo: { width: '100%', height: 200, borderRadius: 12, backgroundColor: '#f3f4f6' },
  
  confirmBtn: { 
    marginTop: 24, backgroundColor: '#3b82f6', width: '100%', 
    paddingVertical: 14, borderRadius: 12, alignItems: 'center' 
  },
  confirmBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
