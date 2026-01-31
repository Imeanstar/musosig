import React, { useEffect, useState, useRef } from 'react';
import { 
  Modal, View, Text, StyleSheet, TouchableOpacity, 
  Dimensions, Vibration, Image 
} from 'react-native';
import { Phone, PhoneOff, MicOff, Grid3X3, Volume2 } from 'lucide-react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface FakeCallModalProps {
  visible: boolean;
  onClose: () => void;
  // callerName prop은 이제 '기본값' 역할만 합니다 (저장된 값이 없으면 사용)
  callerName?: string;
}

const { height, width } = Dimensions.get('window');

// 🎵 벨소리 파일 맵핑 (ID를 키로 사용)
// assets 폴더에 해당 mp3 파일들이 있어야 합니다.
const RINGTONE_MAP: { [key: string]: any } = {
  'ringtone1': require('../../assets/ringtone1.mp3'),
  // 'ringtone2': require('../../assets/ringtone2.mp3'), // 추가 파일이 있다면 주석 해제
};

// 저장소 키 (MemberSettingsModal과 동일해야 함)
const STORAGE_KEY_NAME = 'FAKE_CALLER_NAME';
const STORAGE_KEY_RINGTONE = 'FAKE_CALL_RINGTONE_ID';

export function FakeCallModal({ visible, onClose, callerName = "우리 아빠" }: FakeCallModalProps) {
  const [status, setStatus] = useState<'incoming' | 'connected'>('incoming');
  const [timer, setTimer] = useState(0);
  
  // 📝 화면에 표시될 이름 (설정에서 로드됨)
  const [displayName, setDisplayName] = useState(callerName);

  // 🔊 사운드 객체 Ref (렌더링 없이 즉시 제어하기 위해 ref 사용)
  const soundRef = useRef<Audio.Sound | null>(null);

  // 1. 모달이 열릴 때: 설정 로드 -> 소리/진동 시작
  useEffect(() => {
    if (visible) {
      loadSettingsAndStart();
    } else {
      stopRinging(); // 모달 꺼지면 즉시 중단
    }

    return () => {
      stopRinging(); // 컴포넌트 언마운트 시 안전장치
    };
  }, [visible]);

  // 2. 설정 불러오기 및 벨소리 재생 로직
  const loadSettingsAndStart = async () => {
    try {
      setStatus('incoming');
      setTimer(0);

      // (1) 저장된 이름 가져오기
      const savedName = await AsyncStorage.getItem(STORAGE_KEY_NAME);
      setDisplayName(savedName || callerName);

      // (2) 저장된 벨소리 ID 가져오기
      const savedRingId = await AsyncStorage.getItem(STORAGE_KEY_RINGTONE);
      const ringtoneFile = RINGTONE_MAP[savedRingId || 'ringtone1'] || RINGTONE_MAP['ringtone1'];

      // (3) 진동 시작
      Vibration.vibrate([1000, 2000], true);

      // (4) 오디오 모드 설정 (중요: 무음 모드에서도 소리 나게 시도)
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true, // 🔥 아이폰 무음 스위치 켜져 있어도 소리 재생 시도
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      // (5) 소리 재생
      const { sound } = await Audio.Sound.createAsync(
        ringtoneFile,
        { isLooping: true } // 벨소리 반복
      );
      
      soundRef.current = sound;
      await sound.playAsync();

    } catch (e) {
      console.log('초기화 실패:', e);
    }
  };

  // 3. 소리/진동 멈춤 함수
  const stopRinging = async () => {
    Vibration.cancel();
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (e) {}
      soundRef.current = null;
    }
  };

  // 4. 통화 연결 시 타이머
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (status === 'connected') {
      stopRinging(); // 연결되면 소리 끔
      
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      {/* 배경: 리얼함을 위해 그라데이션 대신 짙은 단색 사용 */}
      <View style={styles.container}>
        <View style={styles.topSpacer} />
        
        <View style={styles.callerInfo}>
          {/* 프로필 이미지 대신 이니셜 원형 */}
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
            // [전화 옴] 받기 / 거절
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
            // [통화 중] 기능 버튼들 & 끊기
            <View style={styles.connectedContainer}>
              {/* 통화 중 기능 버튼 (더미) */}
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
              
              {/* 종료 버튼 */}
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
  avatar: { 
    width: 100, height: 100, borderRadius: 50, 
    backgroundColor: '#9ca3af', justifyContent: 'center', alignItems: 'center', marginBottom: 20 
  },
  avatarText: { fontSize: 40, color: 'white', fontWeight: 'bold' },
  callerName: { fontSize: 34, color: 'white', fontWeight: '400', marginBottom: 10 },
  callStatus: { fontSize: 18, color: '#bdc1c6' },
  
  bottomArea: { position: 'absolute', bottom: 60, width: '100%' },
  
  // 수신 화면 버튼
  incomingActions: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 40 },
  declineBtn: { 
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#ea4335', // 구글 레드
    justifyContent: 'center', alignItems: 'center' 
  },
  acceptBtn: { 
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#34a853', // 구글 그린
    justifyContent: 'center', alignItems: 'center' 
  },
  btnLabel: { color: 'white', fontSize: 14, fontWeight: '500' },

  // 통화 중 화면
  connectedContainer: { alignItems: 'center', width: '100%' },
  gridContainer: { 
    flexDirection: 'row', justifyContent: 'space-evenly', width: '80%', marginBottom: 60 
  },
  gridItem: { alignItems: 'center', gap: 8, opacity: 0.8 },
  gridLabel: { color: 'white', fontSize: 12 },
  
  endCallBtn: { 
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#ea4335', 
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20
  }
});