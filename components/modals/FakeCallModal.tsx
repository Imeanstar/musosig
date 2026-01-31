import React, { useEffect, useState, useRef } from 'react';
import { 
  Modal, View, Text, StyleSheet, TouchableOpacity, 
  Dimensions, Vibration
} from 'react-native';
import { Phone, PhoneOff, MicOff, Grid3X3, Volume2 } from 'lucide-react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface FakeCallModalProps {
  visible: boolean;
  onClose: () => void;
  callerName?: string;
}

const { height } = Dimensions.get('window');

// 🎵 [핵심] 벨소리 파일 맵핑 (assets에 파일 3개가 다 있어야 함!)
const RINGTONE_MAP: { [key: string]: any } = {
  'ringtone1': require('../../assets/ringtone1.mp3'),
  'ringtone2': require('../../assets/ringtone2.mp3'),
  'ringtone3': require('../../assets/ringtone3.mp3'),
  // 'vibration'은 파일이 필요 없어서 맵에 없음
};

const STORAGE_KEY_NAME = 'FAKE_CALLER_NAME';
const STORAGE_KEY_RINGTONE = 'FAKE_CALL_RINGTONE_ID';

export function FakeCallModal({ visible, onClose, callerName = "우리 아빠" }: FakeCallModalProps) {
  const [status, setStatus] = useState<'incoming' | 'connected'>('incoming');
  const [timer, setTimer] = useState(0);
  
  // 표시 이름
  const [displayName, setDisplayName] = useState(callerName);

  // 사운드 객체
  const soundRef = useRef<Audio.Sound | null>(null);

  // 1. 모달 열림/닫힘 감지
  useEffect(() => {
    if (visible) {
      loadSettingsAndStart();
    } else {
      stopRinging();
    }
    return () => { stopRinging(); };
  }, [visible]);

  // 2. 설정 로드 및 실행 로직
  const loadSettingsAndStart = async () => {
    try {
      setStatus('incoming');
      setTimer(0);

      // 이름 가져오기
      const savedName = await AsyncStorage.getItem(STORAGE_KEY_NAME);
      setDisplayName(savedName || callerName);

      // 벨소리 설정 가져오기
      const savedRingId = await AsyncStorage.getItem(STORAGE_KEY_RINGTONE) || 'ringtone1';

      // ✅ 1. 진동은 무조건 시작 (전화가 오면 진동은 기본이니까요)
      // 패턴: 1초 진동, 2초 쉼 반복
      Vibration.vibrate([1000, 2000], true);

      // ✅ 2. '진동만' 모드인지 확인
      if (savedRingId === 'vibration') {
        console.log("📳 진동 모드: 소리 재생 안 함");
        return; // 여기서 함수 종료! (소리 재생 코드 실행 안 됨)
      }

      // ✅ 3. 벨소리 재생 (진동 모드가 아닐 때만 실행됨)
      const ringtoneFile = RINGTONE_MAP[savedRingId] || RINGTONE_MAP['ringtone1'];

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true, // 무음 모드에서도 소리 나게
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        ringtoneFile,
        { isLooping: true }
      );
      
      soundRef.current = sound;
      await sound.playAsync();

    } catch (e) {
      console.log('초기화 실패:', e);
    }
  };

  // 3. 멈춤 (진동+소리)
  const stopRinging = async () => {
    Vibration.cancel(); // 진동 멈춤
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (e) {}
      soundRef.current = null;
    }
  };

  // 4. 통화 연결 후 타이머
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (status === 'connected') {
      stopRinging(); // 연결되면 링소리 멈춤
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [status]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={styles.topSpacer} />
        
        <View style={styles.callerInfo}>
          <View style={styles.avatar}>
             <Text style={styles.avatarText}>{displayName[0]}</Text>
          </View>
          <Text style={styles.callerName}>{displayName}</Text>
          <Text style={styles.callStatus}>
            {status === 'incoming' ? '휴대전화' : formatTime(timer)}
          </Text>
        </View>

        <View style={styles.bottomArea}>
          {status === 'incoming' ? (
            <View style={styles.incomingActions}>
              <View style={{ alignItems: 'center', gap: 8 }}>
                <TouchableOpacity style={styles.declineBtn} onPress={onClose}>
                  <PhoneOff size={32} color="white" />
                </TouchableOpacity>
                <Text style={styles.btnLabel}>거절</Text>
              </View>

              <View style={{ alignItems: 'center', gap: 8 }}>
                <TouchableOpacity 
                  style={styles.acceptBtn} 
                  onPress={() => setStatus('connected')}
                >
                  <Phone size={32} color="white" />
                </TouchableOpacity>
                <Text style={styles.btnLabel}>응답</Text>
              </View>
            </View>
          ) : (
            <View style={styles.connectedContainer}>
              <View style={styles.gridContainer}>
                <View style={styles.gridItem}>
                  <MicOff size={28} color="white" />
                  <Text style={styles.gridLabel}>소리 끔</Text>
                </View>
                <View style={styles.gridItem}>
                  <Grid3X3 size={28} color="white" />
                  <Text style={styles.gridLabel}>키패드</Text>
                </View>
                <View style={styles.gridItem}>
                  <Volume2 size={28} color="white" />
                  <Text style={styles.gridLabel}>스피커</Text>
                </View>
              </View>
              
              <TouchableOpacity style={styles.endCallBtn} onPress={onClose}>
                <PhoneOff size={36} color="white" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#202124', alignItems: 'center' },
  topSpacer: { height: height * 0.15 },
  callerInfo: { alignItems: 'center' },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#9ca3af', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  avatarText: { fontSize: 40, color: 'white', fontWeight: 'bold' },
  callerName: { fontSize: 34, color: 'white', fontWeight: '400', marginBottom: 10 },
  callStatus: { fontSize: 18, color: '#bdc1c6' },
  bottomArea: { position: 'absolute', bottom: 60, width: '100%' },
  incomingActions: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 40 },
  declineBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#ea4335', justifyContent: 'center', alignItems: 'center' },
  acceptBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#34a853', justifyContent: 'center', alignItems: 'center' },
  btnLabel: { color: 'white', fontSize: 14, fontWeight: '500' },
  connectedContainer: { alignItems: 'center', width: '100%' },
  gridContainer: { flexDirection: 'row', justifyContent: 'space-evenly', width: '80%', marginBottom: 60 },
  gridItem: { alignItems: 'center', gap: 8, opacity: 0.8 },
  gridLabel: { color: 'white', fontSize: 12 },
  endCallBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#ea4335', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }
});