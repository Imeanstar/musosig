import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, 
  TextInput, Alert, ScrollView, Switch 
} from 'react-native';
import { X, LogOut, Bell, User, Check } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';

interface MemberSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
}

// 🎵 벨소리 목록 (assets에 파일이 실제로 있어야 함)
// 파일이 없으면 기본 소리 하나만 쓰세요.
const RINGTONES = [
  { id: 'ringtone1', name: '기본 벨소리', file: require('../../assets/ringtone.mp3') }, // 기존 파일
  // { id: 'ringtone2', name: '옛날 전화기', file: require('../../assets/ringtone2.mp3') }, 
  // { id: 'ringtone3', name: '디지털음', file: require('../../assets/ringtone3.mp3') },
];

const STORAGE_KEY_NAME = 'FAKE_CALLER_NAME';
const STORAGE_KEY_RINGTONE = 'FAKE_CALL_RINGTONE_ID';

export function MemberSettingsModal({ visible, onClose, onLogout }: MemberSettingsModalProps) {
  const [callerName, setCallerName] = useState('우리 아빠 ❤️');
  const [selectedRingtoneId, setSelectedRingtoneId] = useState('ringtone1');
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  // 모달 열릴 때 설정 로드
  useEffect(() => {
    if (visible) {
      loadSettings();
    } else {
      stopPreview(); // 닫히면 미리듣기 중지
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
      await AsyncStorage.setItem(STORAGE_KEY_NAME, callerName);
      await AsyncStorage.setItem(STORAGE_KEY_RINGTONE, selectedRingtoneId);
      Alert.alert('저장 완료', '설정이 저장되었습니다.');
      onClose();
    } catch (e) {
      Alert.alert('오류', '저장에 실패했습니다.');
    }
  };

  // 🔔 벨소리 미리듣기
  const playPreview = async (ringtoneId: string) => {
    // 기존 소리 멈춤
    if (sound) {
      await sound.unloadAsync();
    }

    const ringtone = RINGTONES.find(r => r.id === ringtoneId);
    if (!ringtone) return;

    try {
      const { sound: newSound } = await Audio.Sound.createAsync(ringtone.file);
      setSound(newSound);
      await newSound.playAsync();
    } catch (error) {
      console.log('미리듣기 실패', error);
    }
  };

  const stopPreview = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
    }
  };

  // 로그아웃 방어 로직
  const handleLogout = () => {
    Alert.alert(
      '로그아웃 하시겠습니까?',
      '로그아웃하면 보호자와 연결이 끊길 수 있습니다.',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '로그아웃', 
          style: 'destructive', 
          onPress: onLogout 
        }
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>설정</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          
          {/* 섹션 1: 페이크 콜 설정 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📞 긴급 도구 설정</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>화면에 표시될 이름</Text>
              <View style={styles.inputWrapper}>
                <User size={20} color="#9ca3af" />
                <TextInput
                  style={styles.input}
                  value={callerName}
                  onChangeText={setCallerName}
                  placeholder="예: 우리 아빠"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>벨소리 선택</Text>
              <View style={styles.ringtoneList}>
                {RINGTONES.map((ring) => (
                  <TouchableOpacity 
                    key={ring.id}
                    style={[
                      styles.ringtoneItem, 
                      selectedRingtoneId === ring.id && styles.ringtoneItemSelected
                    ]}
                    onPress={() => {
                      setSelectedRingtoneId(ring.id);
                      playPreview(ring.id);
                    }}
                  >
                    <View style={{flexDirection:'row', alignItems:'center'}}>
                      <Bell size={18} color={selectedRingtoneId === ring.id ? '#ea580c' : '#6b7280'} />
                      <Text style={[
                        styles.ringtoneText, 
                        selectedRingtoneId === ring.id && styles.ringtoneTextSelected
                      ]}>
                        {ring.name}
                      </Text>
                    </View>
                    {selectedRingtoneId === ring.id && <Check size={18} color="#ea580c" />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* 섹션 2: 계정 관리 */}
          <View style={[styles.section, { marginTop: 24 }]}>
            <Text style={styles.sectionTitle}>계정 관리</Text>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <LogOut size={20} color="#ef4444" />
              <Text style={styles.logoutText}>로그아웃</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>

        {/* 하단 저장 버튼 */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveBtn} onPress={saveSettings}>
            <Text style={styles.saveBtnText}>저장하기</Text>
          </TouchableOpacity>
        </View>

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
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 16, color: '#111827' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  inputWrapper: { 
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', 
    borderRadius: 12, paddingHorizontal: 12, height: 50 
  },
  input: { flex: 1, marginLeft: 10, fontSize: 16 },
  
  ringtoneList: { gap: 8 },
  ringtoneItem: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' 
  },
  ringtoneItemSelected: { borderColor: '#ea580c', backgroundColor: '#fff7ed' },
  ringtoneText: { marginLeft: 8, color: '#4b5563' },
  ringtoneTextSelected: { color: '#ea580c', fontWeight: 'bold' },

  logoutBtn: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    padding: 16, backgroundColor: '#fee2e2', borderRadius: 12 
  },
  logoutText: { color: '#ef4444', fontWeight: 'bold', marginLeft: 8 },

  footer: { padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  saveBtn: { 
    backgroundColor: '#ea580c', padding: 16, borderRadius: 16, alignItems: 'center' 
  },
  saveBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});