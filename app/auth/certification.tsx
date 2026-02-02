import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

// ⚠️ 아임포트(iamport-react-native) 임시 제거됨
// 나중에 라이브러리 다시 설치하면 원래 코드로 복구해야 합니다.

export default function Certification() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>시스템 점검 중입니다.</Text>
      <Text style={styles.subText}>(본인인증 기능 일시 중지)</Text>
      
      {/* 뒤로가기 버튼 */}
      <Text 
        style={styles.button} 
        onPress={() => router.back()}
      >
        돌아가기
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  button: {
    color: '#007AFF',
    fontSize: 16,
    padding: 10,
  }
});