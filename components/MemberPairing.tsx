import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Dimensions, SafeAreaView } from 'react-native';
import { ChevronLeft, Delete, Check } from 'lucide-react-native';
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

  const isComplete = code.every(c => c !== '');

  // 기존 검증 로직 유지 (이름 복구 로직 포함)
  const verifyAndLink = async () => {
    const fullCode = code.join('');
    if (!isComplete) return;

    setIsLoading(true);
    try {
      // 1. 투명 계정 생성
      let currentUserId = userInfo?.id;
      if (!currentUserId) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user) {
          currentUserId = sessionData.session.user.id;
        } else {
          const randomEmail = `elder_${Date.now()}_${Math.floor(Math.random()*1000)}@musosik.app`;
          const randomPassword = `pass_${Date.now()}_${Math.floor(Math.random()*1000)}`;
          const { data: authData, error: authError } = await supabase.auth.signUp({ email: randomEmail, password: randomPassword });
          if (authError) throw authError;
          if (!authData.user) throw new Error('계정 생성 실패');
          currentUserId = authData.user.id;
        }
      }

      // 2. 대상 찾기
      const { data: targetUser, error: searchError } = await supabase
        .from('users')
        .select('id, role, name, nickname, manager_id, pairing_code_expires_at, pending_member_nickname, pending_member_relation, relation_tag')
        .eq('pairing_code', fullCode)
        .maybeSingle();

      if (searchError || !targetUser) {
        Alert.alert('연결 실패', '유효하지 않은 코드입니다.');
        setIsLoading(false);
        return;
      }

      if (targetUser.pairing_code_expires_at && new Date() > new Date(targetUser.pairing_code_expires_at)) {
         Alert.alert('만료됨', '시간이 초과된 코드입니다.');
         setIsLoading(false);
         return;
      }

      // 3. 연결 로직
      // Case 1: 매니저 (신규)
      if (targetUser.role === 'manager') {
        const { error: updateError } = await supabase.from('users').upsert({ 
            id: currentUserId,
            role: 'member',
            manager_id: targetUser.id,
            name: targetUser.pending_member_nickname || '어르신', 
            relation_tag: targetUser.pending_member_relation || '가족',
            nickname: targetUser.pending_member_nickname || '어르신',
            updated_at: new Date()
        });
        if (updateError) throw updateError;
        Alert.alert('연결 성공!', `${targetUser.name}님과 연결되었습니다.`, [
          { text: '확인', onPress: () => onPairingComplete(targetUser.name) }
        ]);
      } 
      // Case 2: 기존 멤버 (재연결)
      else if (targetUser.role === 'member') {
        const { error: rpcError } = await supabase.rpc('migrate_member_history', {
          old_member_id: targetUser.id,
          new_member_id: currentUserId
        });
        if (rpcError) throw rpcError;

        // 이름 복구 로직 (3중 체크)
        const officialName = targetUser.name ? String(targetUser.name) : '';
        const nickname = targetUser.nickname ? String(targetUser.nickname) : '';
        const pendingName = targetUser.pending_member_nickname ? String(targetUser.pending_member_nickname) : '';
        
        const restoredName = 
          (officialName.trim() !== '') ? officialName :
          (nickname.trim() !== '') ? nickname :
          (pendingName.trim() !== '') ? pendingName : '어르신';

        const { error: updateError } = await supabase.from('users').upsert({
             id: currentUserId,
             role: 'member',
             manager_id: targetUser.manager_id,
             name: restoredName,
             nickname: restoredName,
             relation_tag: targetUser.pending_member_relation || targetUser.relation_tag || '가족',
             updated_at: new Date()
          });

        if (updateError) throw updateError;
        Alert.alert('재연결 성공', `"${restoredName}"님의 기록을 불러왔습니다!`, [
          { text: '확인', onPress: () => onPairingComplete('보호자') }
        ]);
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert('오류', '연결 중 문제가 발생했습니다.');
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

        {/* 하단 버튼 영역 (고정) */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.submitBtn, !isComplete && styles.submitBtnDisabled]} 
            onPress={verifyAndLink}
            disabled={!isComplete || isLoading}
          >
            <Text style={styles.submitBtnText}>연결하기</Text>
            {isComplete && <Check color="white" size={24} style={{ marginLeft: 8 }} />}
          </TouchableOpacity>
        </View>

        {/* 🔥 로딩 오버레이 (가장 위에 뜸 - zIndex 활용) */}
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
  container: { flex: 1, position: 'relative' }, // relative 설정 (오버레이 위치 기준)
  
  backBtn: { marginTop: 10, marginLeft: 20, padding: 10, alignSelf: 'flex-start' },
  
  content: { 
    flex: 1, // 남은 공간을 다 씀
    justifyContent: 'space-evenly', // 내용물끼리 적당히 떨어짐
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

  // 키패드 영역
  keypadSection: { justifyContent: 'center', alignItems: 'center' },
  keypad: { 
    flexDirection: 'row', flexWrap: 'wrap', 
    gap: 14, justifyContent: 'center', width: 320 
  },
  keyBtn: { 
    width: 75, height: 75, // 크기 살짝 조절
    backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', 
    borderRadius: 40, 
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: {width:0, height:2} 
  },
  keyText: { fontSize: 30, fontWeight: 'bold', color: '#333' },
  delBtn: { backgroundColor: '#fee2e2' },

  // 하단 버튼
  footer: { padding: 20, paddingBottom: 30 },
  submitBtn: { 
    backgroundColor: '#ea580c', height: 60, borderRadius: 16, 
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#ea580c', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
  },
  submitBtnDisabled: { backgroundColor: '#fed7aa', shadowOpacity: 0, elevation: 0 },
  submitBtnText: { color: 'white', fontSize: 20, fontWeight: 'bold' },

  // 🔥 로딩 오버레이 스타일
  loadingOverlay: {
    position: 'absolute', // 둥둥 떠있음
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // 반투명 배경
    justifyContent: 'center', alignItems: 'center',
    zIndex: 999, // 제일 위에 보임
  },
  loadingBox: {
    backgroundColor: 'white', padding: 24, borderRadius: 16,
    alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10
  },
  loadingText: { marginTop: 16, fontSize: 16, color: '#4b5563', fontWeight: '600' }
});