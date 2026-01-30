import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Dimensions, SafeAreaView } from 'react-native';
// 👇 1. 필요한 아이콘과 라이브러리 추가
import { ChevronLeft, Delete, Check, ClipboardPaste } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard'; 
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useUserManagement } from '../hooks/useUserManagement';

interface MemberPairingProps {
  onPairingComplete: (managerName: string) => void;
  onBack: () => void;
}

const { width, height } = Dimensions.get('window');

export function MemberPairing({ onPairingComplete, onBack }: MemberPairingProps) {
  const { userInfo } = useUserManagement();
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  
  // 👇 2. 안전 영역 높이 가져오기
  const insets = useSafeAreaInsets();

  const isComplete = code.every(c => c !== '');

  // 📋 [추가됨] 붙여넣기 기능
  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    // 숫자만 남기고 제거
    const numbersOnly = text.replace(/[^0-9]/g, '');

    if (numbersOnly.length === 0) {
      Alert.alert("알림", "복사된 내용에 숫자가 없습니다.");
      return;
    }

    // 6자리로 자르고 배열로 변환
    const newCodeArr = numbersOnly.slice(0, 6).split('');
    
    // 6자리가 안 되면 나머지는 빈칸으로 채우기
    while (newCodeArr.length < 6) {
      newCodeArr.push('');
    }

    setCode(newCodeArr);
    Alert.alert("성공", "코드를 붙여넣었습니다! 😊");
  };

  // 기존 검증 로직 유지 (이름 복구 로직 포함)
  const verifyAndLink = async () => {
    const fullCode = code.join('');
    if (!isComplete) return;

    setIsLoading(true);
    try {
      // 1. 현재 로그인된 유저 ID 가져오기 (없으면 익명 로그인)
      let currentUserId = userInfo?.id;
      if (!currentUserId) {
        const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
        if (authError || !authData.user) throw new Error('로그인 실패');
        currentUserId = authData.user.id;
      }

      // 2. 코드 주인(대상) 찾기
      const { data: targetUser, error: searchError } = await supabase
        .from('users')
        .select('*') // 모든 정보 다 가져옴
        .eq('pairing_code', fullCode)
        .maybeSingle();

      if (searchError || !targetUser) {
        Alert.alert('연결 실패', '유효하지 않은 코드입니다.');
        setIsLoading(false);
        return;
      }

      // 3. 상황별 분기 처리

      // [Case A] 매니저와 처음 연결하는 경우 (targetUser가 매니저임)
      if (targetUser.role === 'manager') {
        const { error: updateError } = await supabase.from('users').update({ 
            role: 'member',
            manager_id: targetUser.id,
            updated_at: new Date()
        }).eq('id', currentUserId); // 내 정보를 업데이트

        if (updateError) throw updateError;
        
        // 🚀 전화번호가 없으면 입력 페이지로 가야 함 (여기선 일단 성공 처리하고, Main에서 체크 추천)
        onPairingComplete(targetUser.name);
      } 
      
      // [Case B] 기존 멤버 계정을 복구하는 경우 (targetUser가 멤버임)
      else if (targetUser.role === 'member') {
        
        // 🔥 여기가 핵심! SQL 함수 호출 (중복 에러 없이 영혼 체인지)
        const { error: rpcError } = await supabase.rpc('migrate_member_history', {
          old_member_id: targetUser.id,  // 코드 주인의 ID (뺏길 놈)
          new_member_id: currentUserId   // 지금 내 ID (뺏을 놈)
        });

        if (rpcError) throw rpcError;

        // 성공! (전화번호도 같이 넘어왔으므로 입력창 갈 필요 없음)
        Alert.alert('재연결 성공', `"${targetUser.name}"님의 기록을 모두 불러왔습니다!`, [
          { text: '시작하기', onPress: () => onPairingComplete('보호자') }
        ]);
      }

    } catch (e: any) {
      console.error("Pairing Error:", e);
      Alert.alert('오류', '연결 중 문제가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePress = (num: string) => {
    const emptyIdx = code.findIndex(c => c === '');
    if (emptyIdx === -1) return;
    const newCode = [...code];
    newCode[emptyIdx] = num;
    setCode(newCode);
  };

  const handleDelete = () => {
    const lastIdx = [...code].reverse().findIndex(c => c !== '');
    if (lastIdx === -1) return;
    const realIdx = 5 - lastIdx;
    const newCode = [...code];
    newCode[realIdx] = '';
    setCode(newCode);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* 상단 뒤로가기 */}
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <ChevronLeft color="#c2410c" size={32} />
        </TouchableOpacity>

        {/* 메인 컨텐츠 영역 (Flex로 공간 분배) */}
        <View style={styles.content}>
          
          {/* 타이틀 영역 */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>보호자가 알려준{'\n'}숫자 6개를 눌러주세요</Text>
            
            <View style={styles.codeContainer}>
              {code.map((c, i) => (
                <View key={i} style={[styles.codeBox, c !== '' && styles.codeBoxActive]}>
                  <Text style={styles.codeText}>{c}</Text>
                </View>
              ))}
            </View>

            {/* 👇 3. [추가됨] 붙여넣기 버튼 */}
            <TouchableOpacity style={styles.pasteButton} onPress={handlePaste}>
               <ClipboardPaste size={18} color="#6b7280" />
               <Text style={styles.pasteText}>복사한 코드 붙여넣기</Text>
            </TouchableOpacity>
          </View>

          {/* 키패드 영역 */}
          <View style={styles.keypadSection}>
            <View style={styles.keypad}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                <TouchableOpacity key={n} onPress={() => handlePress(String(n))} style={styles.keyBtn} disabled={isLoading}>
                  <Text style={styles.keyText}>{n}</Text>
                </TouchableOpacity>
              ))}
              <View style={styles.keyBtn} />
              <TouchableOpacity onPress={() => handlePress('0')} style={styles.keyBtn} disabled={isLoading}>
                <Text style={styles.keyText}>0</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={[styles.keyBtn, styles.delBtn]} disabled={isLoading}>
                <Delete color="#dc2626" />
              </TouchableOpacity>
            </View>
          </View>

        </View>

        {/* 하단 버튼 영역 */}
        {/* 👇 4. [수정됨] insets.bottom을 적용하여 가림 현상 해결 */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity 
            style={[styles.submitBtn, !isComplete && styles.submitBtnDisabled]} 
            onPress={verifyAndLink}
            disabled={!isComplete || isLoading}
          >
            <Text style={styles.submitBtnText}>연결하기</Text>
            {isComplete && <Check color="white" size={24} style={{ marginLeft: 8 }} />}
          </TouchableOpacity>
        </View>

        {/* 로딩 오버레이 */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#ea580c" />
              <Text style={styles.loadingText}>
                {userInfo ? '보호자와 연결 중...' : '계정 생성 중...'}
              </Text>
            </View>
          </View>
        )}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff7ed' },
  container: { flex: 1, position: 'relative' }, 
  
  backBtn: { marginTop: 40, marginLeft: 20, padding: 10, alignSelf: 'flex-start' },
  
  content: { 
    flex: 1, 
    justifyContent: 'space-evenly', 
    alignItems: 'center',
    paddingBottom: 20 
  },

  // 타이틀 & 코드박스 영역
  titleSection: { alignItems: 'center' },
  title: { 
    fontSize: 26, fontWeight: 'bold', color: '#ea580c', 
    textAlign: 'center', lineHeight: 36, marginBottom: 30 
  },
  codeContainer: { flexDirection: 'row', gap: 8 },
  codeBox: { 
    width: 45, height: 60, backgroundColor: 'white', 
    justifyContent: 'center', alignItems: 'center', 
    borderRadius: 10, borderWidth: 2, borderColor: '#fed7aa' 
  },
  codeBoxActive: { borderColor: '#ea580c', backgroundColor: '#fff' },
  codeText: { fontSize: 24, fontWeight: 'bold', color: '#333' },

  // 👇 [추가됨] 붙여넣기 버튼 스타일
  pasteButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)', 
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    marginTop: 20,
    borderWidth: 1, borderColor: '#fed7aa'
  },
  pasteText: { marginLeft: 8, fontSize: 16, color: '#4b5563', fontWeight: '600' },

  // 키패드 영역
  keypadSection: { justifyContent: 'center', alignItems: 'center' },
  keypad: { 
    flexDirection: 'row', flexWrap: 'wrap', 
    gap: 14, justifyContent: 'center', width: 320 
  },
  keyBtn: { 
    width: 75, height: 75, 
    backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', 
    borderRadius: 40, 
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: {width:0, height:2} 
  },
  keyText: { fontSize: 30, fontWeight: 'bold', color: '#333' },
  delBtn: { backgroundColor: '#fee2e2' },

  // 하단 버튼 (패딩은 인라인 스타일로 동적 적용)
  footer: { paddingHorizontal: 20 },
  submitBtn: { 
    backgroundColor: '#ea580c', height: 60, borderRadius: 16, 
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#ea580c', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
  },
  submitBtnDisabled: { backgroundColor: '#fed7aa', shadowOpacity: 0, elevation: 0 },
  submitBtnText: { color: 'white', fontSize: 20, fontWeight: 'bold' },

  // 로딩 오버레이
  loadingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 999,
  },
  loadingBox: {
    backgroundColor: 'white', padding: 24, borderRadius: 16,
    alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10
  },
  loadingText: { marginTop: 16, fontSize: 16, color: '#4b5563', fontWeight: '600' }
});