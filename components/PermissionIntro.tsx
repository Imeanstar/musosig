/**
 * components/PermissionIntro.tsx
 * - 🔔 알림: 필수 (안부 확인 놓치면 안 됨)
 * - 📸 카메라: 선택 (나중에 켜도 됨)
 */
import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  Linking, Platform 
} from 'react-native';
import { Camera, Bell, Check } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker'; 
import * as Notifications from 'expo-notifications'; 

// 🚨 예쁜 모달 import (경로 확인해주세요!)
import CustomAlertModal from './modals/CustomAlertModal'; 

interface PermissionIntroProps {
  onAllGranted: () => void; // 부모에게 "끝났어요!" 하고 알리는 신호
}

export function PermissionIntro({ onAllGranted }: PermissionIntroProps) {
  const [cameraStatus, setCameraStatus] = useState<boolean>(false);
  const [notiStatus, setNotiStatus] = useState<boolean>(false);
  
  // 모달 상태 관리
  const [modalVisible, setModalVisible] = useState(false);

  // 1. 현재 권한 상태 확인 (앱 켜자마자 실행)
  const checkPermissions = async () => {
    const { status: cam } = await ImagePicker.getCameraPermissionsAsync();
    const { status: noti } = await Notifications.getPermissionsAsync();

    setCameraStatus(cam === 'granted');
    setNotiStatus(noti === 'granted');

    // 🚨 수정됨: "알림"만 허용되어 있으면 일단 통과시킵니다. (카메라는 선택이니까)
    // 하지만 처음 설치했으면 사용자가 인지하도록 화면을 보여주는 게 좋습니다.
    // 여기서는 이미 허용된 상태라면 바로 넘어가는 로직입니다.
    if (noti === 'granted') {
      onAllGranted();
    }
  };

  useEffect(() => {
    checkPermissions();
  }, []);

  // 2. 권한 요청 버튼 클릭 시
  const requestAll = async () => {
    try {
      // (1) 알림 권한 요청 (필수)
      const notiRes = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      setNotiStatus(notiRes.status === 'granted');

      // (2) 카메라 권한 요청 (선택 - 거절해도 됨)
      const camRes = await ImagePicker.requestCameraPermissionsAsync();
      setCameraStatus(camRes.status === 'granted');

      // (3) 결과 확인
      // 🚨 수정됨: 알림만 허용되면 통과! (카메라는 상관없음)
      if (notiRes.status === 'granted') {
        onAllGranted(); 
      } else {
        // 알림을 거절했을 경우 -> 모달 띄우기
        setModalVisible(true);
      }
    } catch (e) {
      console.error(e);
      // 에러 나면 일단 통과시킴 (앱 사용 막지 않음)
      onAllGranted();
    }
  };

  // 모달에서 '설정으로 이동' 클릭 시
  const handleOpenSettings = () => {
    setModalVisible(false);
    Linking.openSettings();
  };

  // 모달에서 '다음에 하기' (닫기) 클릭 시 -> 알림 없이 일단 앱 진입
  const handlePassAnyway = () => {
    setModalVisible(false);
    onAllGranted();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>앱 사용을 위해{'\n'}권한 허용이 필요해요 🙏</Text>
        <Text style={styles.subtitle}>
          가족과의 원활한 소통을 위해{'\n'}알림 권한을 꼭 허용해주세요.
        </Text>
      </View>

      <View style={styles.permissionList}>

        {/* 알림 권한 (필수) */}
        <View style={styles.item}>
          <View style={styles.iconBox}>
            <Bell size={24} color="#ea580c" />
          </View>
          <View style={styles.textBox}>
            <Text style={styles.itemTitle}>알림 (필수)</Text>
            <Text style={styles.itemDesc}>안부 확인 시간을 놓치지 않게 알려드려요.</Text>
          </View>
          {/* {notiStatus && <Check size={20} color="#15803d" />} */}
        </View>

        {/* 카메라 권한 (선택) */}
        <View style={styles.item}>
          <View style={styles.iconBox}>
            <Camera size={24} color="#ea580c" />
          </View>
          <View style={styles.textBox}>
            <Text style={styles.itemTitle}>카메라 (선택)</Text>
            <Text style={styles.itemDesc}>안부를 전할 때 카메라를 사용합니다.</Text>
          </View>
          {/* {cameraStatus && <Check size={20} color="#15803d" />} */}
        </View>
        
      </View>

      <TouchableOpacity style={styles.button} onPress={requestAll}>
        <Text style={styles.buttonText}>동의하고 시작하기</Text>
      </TouchableOpacity>

      {/* 🚨 Alert 대신 CustomAlertModal 사용 */}
      <CustomAlertModal
        visible={modalVisible}
        title="알림 권한이 필요해요 😢"
        message={'원활한 안부 확인을 위해\n[알림] 권한은 꼭 필요합니다.\n설정에서 허용해 주시겠어요?'}
        confirmText="설정으로 이동"
        cancelText="다음에 하기"
        type="default" // 주황색 경고 느낌
        onConfirm={handleOpenSettings} // 확인 -> 설정창 이동
        onClose={handlePassAnyway}    // 취소 -> 일단 앱 진입
      />
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