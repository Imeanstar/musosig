import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, 
  TextInput, Alert, ScrollView, Vibration 
} from 'react-native';
import { X, LogOut, Bell, User, Check, Lock, Smartphone } from 'lucide-react-native'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import CustomAlertModal from '../modals/CustomAlertModal';

interface MemberSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
  isPremium: boolean;
}

// 🎵 벨소리 옵션 목록
const RINGTONE_OPTIONS = [
  { id: 'vibration', name: '📳 진동만', file: null },
  { id: 'ringtone1', name: '벨소리1', file: require('../../assets/ringtone1.mp3') },
  { id: 'ringtone2', name: '벨소리2', file: require('../../assets/ringtone2.mp3') },
  { id: 'ringtone3', name: '벨소리3', file: require('../../assets/ringtone3.mp3') },
];

const STORAGE_KEY_NAME = 'FAKE_CALLER_NAME';
const STORAGE_KEY_RINGTONE = 'FAKE_CALL_RINGTONE_ID';

export function MemberSettingsModal({ visible, onClose, onLogout, isPremium }: MemberSettingsModalProps) {
  const [callerName, setCallerName] = useState('우리 아빠 ❤️');
  const [selectedRingtoneId, setSelectedRingtoneId] = useState('ringtone1');
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [saveSuccessVisible, setSaveSuccessVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      loadSettings();
    } else {
      stopPreview();
    }
  }, [visible]);

  const loadSettings = async () => {
    try {
      const savedName = await AsyncStorage.getItem(STORAGE_KEY_NAME);
      const savedRing = await AsyncStorage.getItem(STORAGE_KEY_RINGTONE);
      if (savedName) setCallerName(savedName);
      if (savedRing) setSelectedRingtoneId(savedRing);
    } catch (e) {
      console.error(e);
    }
  };

  const saveSettings = async () => {
    try {
      if (isPremium) {
        await AsyncStorage.setItem(STORAGE_KEY_NAME, callerName);
        await AsyncStorage.setItem(STORAGE_KEY_RINGTONE, selectedRingtoneId);
      }
      
      // 🚨 [수정] Alert 대신 모달 켜기!
      // 여기서 바로 onClose()를 하지 않고, 모달에서 '확인' 누르면 닫히게 합니다.
      setSaveSuccessVisible(true);

    } catch (e: any) {
      Alert.alert(
        '저장 실패 😢', 
        `오류가 발생했습니다.\n${e.message || JSON.stringify(e)}`
      );
    }
  };

  // 🔔 미리듣기 (진동 or 소리)
  const playPreview = async (ringtoneId: string) => {
    stopPreview();

    if (ringtoneId === 'vibration') {
      Vibration.vibrate([0, 400, 100, 400]); 
      return;
    }

    const ringtone = RINGTONE_OPTIONS.find(r => r.id === ringtoneId);
    if (!ringtone || !ringtone.file) return;

    try {
      const { sound: newSound } = await Audio.Sound.createAsync(ringtone.file);
      setSound(newSound);
      await newSound.playAsync();
    } catch (error) {
      console.log('미리듣기 실패', error);
    }
  };

  const stopPreview = async () => {
    Vibration.cancel(); 
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
    }
  };

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const handleLockedPress = () => {
    Alert.alert("프리미엄 기능 🔒", "보호자가 프리미엄 회원이어야 설정을 변경할 수 있습니다.");
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>설정</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          
          <View style={[styles.section, !isPremium && styles.disabledSection]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📞 긴급 도구 설정</Text>
              {!isPremium && (
                <View style={styles.premiumBadge}>
                  <Lock size={12} color="white" strokeWidth={3} />
                  <Text style={styles.premiumText}>Premium</Text>
                </View>
              )}
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>화면에 표시될 이름</Text>
              <TouchableOpacity 
                activeOpacity={1} 
                onPress={!isPremium ? handleLockedPress : undefined}
                style={[styles.inputWrapper, !isPremium && styles.disabledInput]}
              >
                <User size={20} color={isPremium ? "#9ca3af" : "#d1d5db"} />
                <TextInput
                  style={[styles.input, !isPremium && { color: '#9ca3af' }]}
                  value={callerName}
                  onChangeText={setCallerName}
                  placeholder="예: 우리 아빠"
                  editable={isPremium}
                  maxLength={15}
                />
                
                {/* 👇 [수정됨] 프리미엄이면 카운터 표시, 아니면 자물쇠 표시 */}
                {isPremium ? (
                  <Text style={styles.counterText}>
                    {callerName.length}/15
                  </Text>
                ) : (
                  <Lock size={16} color="#d1d5db" />
                )}

              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>알림 방식 선택</Text>
              <View style={styles.ringtoneList}>
                {RINGTONE_OPTIONS.map((option) => (
                  <TouchableOpacity 
                    key={option.id}
                    disabled={!isPremium}
                    style={[
                      styles.ringtoneItem, 
                      selectedRingtoneId === option.id && styles.ringtoneItemSelected,
                      !isPremium && styles.disabledItem
                    ]}
                    onPress={() => {
                      setSelectedRingtoneId(option.id);
                      playPreview(option.id);
                    }}
                  >
                    <View style={{flexDirection:'row', alignItems:'center'}}>
                      {option.id === 'vibration' ? (
                        <Smartphone size={18} color={isPremium && selectedRingtoneId === option.id ? '#ea580c' : '#9ca3af'} />
                      ) : (
                        <Bell size={18} color={isPremium && selectedRingtoneId === option.id ? '#ea580c' : '#9ca3af'} />
                      )}
                      
                      <Text style={[
                        styles.ringtoneText, 
                        isPremium && selectedRingtoneId === option.id && styles.ringtoneTextSelected,
                        !isPremium && { color: '#9ca3af' }
                      ]}>
                        {option.name}
                      </Text>
                    </View>
                    {selectedRingtoneId === option.id && (
                      <Check size={18} color={isPremium ? "#ea580c" : "#d1d5db"} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={[styles.section, { marginTop: 24 }]}>
            <Text style={styles.sectionTitle}>계정 관리</Text>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <LogOut size={20} color="#ef4444" />
              <Text style={styles.logoutText}>로그아웃</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveBtn} onPress={saveSettings}>
            <Text style={styles.saveBtnText}>저장하기</Text>
          </TouchableOpacity>
        </View>

        {/* 🚨 [추가] 로그아웃 경고 모달 */}
        <CustomAlertModal
          visible={logoutModalVisible}
          title="로그아웃 하시겠습니까?"
          message="로그아웃하면 보호자와 연결이 끊길 수 있습니다."
          confirmText="로그아웃"
          cancelText="취소"
          type="danger" // 🔴 빨간색 버튼 (중요!)
          onClose={() => setLogoutModalVisible(false)} // 닫기/취소
          onConfirm={() => {
            setLogoutModalVisible(false); // 모달 닫고
            onLogout(); // ✅ 진짜 로그아웃 실행
          }}
        />
        {/* 🚨 [추가] 저장 완료 모달 */}
        <CustomAlertModal
          visible={saveSuccessVisible}
          title="저장 완료 ✨"
          message="설정이 성공적으로 저장되었습니다."
          confirmText="확인"
          cancelText="닫기" 
          type="default" // 파란색 버튼
          onClose={() => {
              // 배경 누르거나 취소 누르면 -> 알림창만 닫고 설정창은 유지 (혹은 같이 닫아도 됨)
              setSaveSuccessVisible(false);
              onClose(); // 편의상 같이 닫아주는 게 자연스럽습니다.
          }} 
          onConfirm={() => {
              // 확인 누르면 -> 알림창 닫고 + 설정창도 닫기
              setSaveSuccessVisible(false);
              onClose(); 
          }}
        />

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { 
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', 
    padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' 
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  closeBtn: { position: 'absolute', right: 16 },
  content: { padding: 20 },
  section: { backgroundColor: 'white', borderRadius: 16, padding: 16 },
  disabledSection: { backgroundColor: '#f3f4f6', opacity: 0.9 }, 
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  premiumBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#6b7280', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  premiumText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, height: 50, backgroundColor: 'white' },
  disabledInput: { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb' },
  input: { flex: 1, marginLeft: 10, fontSize: 16, color: '#111827' },
  
  // 👇 [추가됨] 카운터 텍스트 스타일
  counterText: { fontSize: 12, color: '#9ca3af', marginLeft: 8 },

  ringtoneList: { gap: 8 },
  ringtoneItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: 'white' },
  disabledItem: { backgroundColor: '#f3f4f6' },
  ringtoneItemSelected: { borderColor: '#ea580c', backgroundColor: '#fff7ed' },
  ringtoneText: { marginLeft: 8, color: '#4b5563' },
  ringtoneTextSelected: { color: '#ea580c', fontWeight: 'bold' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: '#fee2e2', borderRadius: 12 },
  logoutText: { color: '#ef4444', fontWeight: 'bold', marginLeft: 8 },
  footer: { padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  saveBtn: { backgroundColor: '#ea580c', padding: 16, borderRadius: 16, alignItems: 'center' },
  saveBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});