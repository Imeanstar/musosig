import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import { Smartphone, X } from 'lucide-react-native';
import { Accelerometer } from 'expo-sensors';

interface ShakeModalProps {
  visible: boolean;
  onCancel: () => void;
  onComplete: () => void; // ✅ 부모에게 "다 채웠어!" 라고 알리는 함수
}

export function ShakeModal({ visible, onCancel, onComplete }: ShakeModalProps) {
  const [progress, setProgress] = useState(0); // 0.0 ~ 1.0
  const [iconRotate] = useState(new Animated.Value(0)); // 아이콘 흔들기 효과

  useEffect(() => {
    // 모달이 안 보이면 아무것도 안 함 (초기화)
    if (!visible) {
      setProgress(0);
      return;
    }

    let subscription: any;

    const startShakeDetection = () => {
      Accelerometer.setUpdateInterval(100); // 0.1초마다 감지

      subscription = Accelerometer.addListener(({ x, y, z }) => {
        // 1. 흔들림 강도 계산
        const acceleration = Math.sqrt(x * x + y * y + z * z);
        const SHAKE_THRESHOLD = 1.8; // 감도 (낮을수록 쉬움)

        if (acceleration > SHAKE_THRESHOLD) {
          // 2. 게이지 채우기 (0.1 = 10%씩 증가)
          setProgress((prev) => {
            const newProgress = prev + 0.1; 
            
            // 3. 100% 달성 시
            if (newProgress >= 1) {
              if (subscription) subscription.remove(); // 센서 끄기
              onComplete(); // 🎉 완료 신호 전송!
              return 1;
            }
            return newProgress;
          });

          // (보너스) 아이콘 흔들거리는 애니메이션
          Animated.sequence([
            Animated.timing(iconRotate, { toValue: 1, duration: 50, useNativeDriver: true }),
            Animated.timing(iconRotate, { toValue: -1, duration: 50, useNativeDriver: true }),
            Animated.timing(iconRotate, { toValue: 0, duration: 50, useNativeDriver: true }),
          ]).start();
        }
      });
    };

    startShakeDetection();

    // 청소 (모달 닫힐 때 센서 해제)
    return () => {
      subscription && subscription.remove();
      setProgress(0);
    };
  }, [visible]);

  // 애니메이션 값 매핑
  const rotateInterp = iconRotate.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-15deg', '15deg'],
  });

  const percentage = Math.min(Math.floor(progress * 100), 100);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>📱 휴대폰 흔들기</Text>
          <Text style={styles.desc}>게이지가 찰 때까지{'\n'}신나게 흔들어주세요!</Text>
          
          <Animated.View style={{ marginBottom: 20, transform: [{ rotate: rotateInterp }] }}>
             <Smartphone size={80} color={progress >= 1 ? "#10b981" : "#f43f5e"} />
          </Animated.View>
          
          <View style={styles.progressBg}>
            <View style={[
              styles.progressFill, 
              { width: `${percentage}%` },
              progress >= 1 && { backgroundColor: '#10b981' } // 완료되면 초록색
            ]} />
          </View>
          
          <Text style={[styles.progressText, progress >= 1 && { color: '#10b981' }]}>
            {percentage}% 완료
          </Text>

          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>취소</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  content: { width: '85%', backgroundColor: 'white', borderRadius: 24, padding: 32, alignItems: 'center', elevation: 5 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  desc: { fontSize: 16, color: '#6b7280', marginBottom: 24, textAlign: 'center', lineHeight: 24 },
  progressBg: { width: '100%', height: 20, backgroundColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#f43f5e' },
  progressText: { marginTop: 10, fontWeight: 'bold', color: '#f43f5e' },
  cancelBtn: { marginTop: 20, width: '100%', backgroundColor: '#f3f4f6', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  cancelText: { fontSize: 18, fontWeight: '600', color: '#4b5563' },
});