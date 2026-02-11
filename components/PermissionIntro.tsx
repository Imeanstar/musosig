/**
 * components/PermissionIntro.tsx (최종 수정: 앨범 권한 제거)
 * - 📸 카메라: 안부 인증샷 필수
 * - 🔔 알림: 안부 확인 시간 알림 필수
 */
import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  Linking, Alert 
} from 'react-native';
import { Camera, Bell, Check } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker'; // 카메라 권한용
import * as Notifications from 'expo-notifications'; // 알림 권한용

interface PermissionIntroProps {
  onAllGranted: () => void;
}

export function PermissionIntro({ onAllGranted }: PermissionIntroProps) {
  const [cameraStatus, setCameraStatus] = useState<boolean>(false);
  const [notiStatus, setNotiStatus] = useState<boolean>(false);

  // 1. 현재 권한 상태 확인
  const checkPermissions = async () => {
    const { status: cam } = await ImagePicker.getCameraPermissionsAsync();
    const { status: noti } = await Notifications.getPermissionsAsync();

    setCameraStatus(cam === 'granted');
    setNotiStatus(noti === 'granted');

    // 카메라와 알림만 허용되면 통과!
    if (cam === 'granted' && noti === 'granted') {
      onAllGranted();
    }
  };

  useEffect(() => {
    checkPermissions();
  }, []);

  // 2. 권한 요청 버튼 클릭 시
  const requestAll = async () => {
    try {
      // (1) 카메라 권한 요청
      const camRes = await ImagePicker.requestCameraPermissionsAsync();
      
      // (2) 알림 권한 요청
      const notiRes = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });

      // (3) 결과 확인 (앨범은 체크 안 함)
      if (camRes.status === 'granted' && notiRes.status === 'granted') {
        onAllGranted(); 
      } else {
        Alert.alert(
          "필수 권한 안내",
          "원활한 안부 확인을 위해 [카메라]와 [알림] 권한은 꼭 필요합니다.\n설정에서 허용해주세요.",
          [
            { text: "다음에 하기", style: "cancel", onPress: onAllGranted },
            { text: "설정으로 이동", onPress: () => Linking.openSettings() }
          ]
        );
      }
    } catch (e) {
      console.error(e);
      onAllGranted();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>앱 사용을 위해{'\n'}권한 허용이 필요해요 🙏</Text>
        <Text style={styles.subtitle}>
          가족과의 안전한 소통을 위해{'\n'}아래 두 가지 권한을 허용해주세요.
        </Text>
      </View>

      <View style={styles.permissionList}>
        {/* 카메라 권한 */}
        <View style={styles.item}>
          <View style={styles.iconBox}>
            <Camera size={24} color="#ea580c" />
          </View>
          <View style={styles.textBox}>
            <Text style={styles.itemTitle}>카메라 (필수)</Text>
            <Text style={styles.itemDesc}>지금 내 모습을 찍어 안부를 전합니다.</Text>
          </View>
          {cameraStatus && <Check size={20} color="#15803d" />}
        </View>

        {/* 알림 권한 */}
        <View style={styles.item}>
          <View style={styles.iconBox}>
            <Bell size={24} color="#ea580c" />
          </View>
          <View style={styles.textBox}>
            <Text style={styles.itemTitle}>알림 (필수)</Text>
            <Text style={styles.itemDesc}>안부 확인 시간을 놓치지 않게 알려드려요.</Text>
          </View>
          {notiStatus && <Check size={20} color="#15803d" />}
        </View>
      </View>

      <TouchableOpacity style={styles.button} onPress={requestAll}>
        <Text style={styles.buttonText}>동의하고 시작하기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white', padding: 24, justifyContent: 'center' },
  header: { marginBottom: 40 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#111827', marginBottom: 12, lineHeight: 36 },
  subtitle: { fontSize: 16, color: '#6b7280', lineHeight: 24 },
  
  permissionList: { marginBottom: 40 },
  item: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  iconBox: { 
    width: 48, height: 48, borderRadius: 16, backgroundColor: '#fff7ed', 
    justifyContent: 'center', alignItems: 'center', marginRight: 16 
  },
  textBox: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  itemDesc: { fontSize: 13, color: '#6b7280' },

  button: { 
    backgroundColor: '#ea580c', height: 56, borderRadius: 16, 
    justifyContent: 'center', alignItems: 'center', marginTop: 'auto', marginBottom: 20
  },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});