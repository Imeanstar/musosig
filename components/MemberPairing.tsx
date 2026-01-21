import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { ChevronLeft, Delete, Check } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useUserManagement } from '../hooks/useUserManagement';

interface MemberPairingProps {
  onPairingComplete: (managerName: string) => void;
  onBack: () => void;
}

export function MemberPairing({ onPairingComplete, onBack }: MemberPairingProps) {
  const { userInfo } = useUserManagement();
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);

  const isComplete = code.every(c => c !== '');

  const verifyAndLink = async () => {
    const fullCode = code.join('');
    if (!isComplete) return;

    setIsLoading(true);
    try {
      // 1. 투명 계정(익명) 로그인 처리
      let currentUserId = userInfo?.id;

      if (!currentUserId) {
        // 세션 확인
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData.session?.user) {
          currentUserId = sessionData.session.user.id;
        } else {
          // 투명 가입 시도
          const randomEmail = `elder_${Date.now()}_${Math.floor(Math.random()*1000)}@musosik.app`;
          const randomPassword = `pass_${Date.now()}_${Math.floor(Math.random()*1000)}`;

          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: randomEmail,
            password: randomPassword,
          });

          if (authError) throw authError;

          // 🔥 [중요 체크] 가입은 됐는데 세션이 없다? -> 이메일 인증 설정 문제!
          if (authData.user && !authData.session) {
            Alert.alert(
              '설정 확인 필요', 
              '서버의 [이메일 인증] 설정이 켜져있어 로그인이 안 됩니다.\nSupabase에서 Confirm email을 꺼주세요.'
            );
            setIsLoading(false);
            return;
          }

          if (!authData.user) throw new Error('계정 생성에 실패했습니다.');
          currentUserId = authData.user.id;
        }
      }

      // 2. 매니저 찾기
      const { data: manager, error: searchError } = await supabase
        .from('users')
        .select('id, name, pairing_code_expires_at, pending_member_nickname, pending_member_relation')
        .eq('pairing_code', fullCode)
        .eq('role', 'manager')
        .maybeSingle();

      if (searchError || !manager) {
        Alert.alert('연결 실패', '유효하지 않은 코드입니다.\n코드를 다시 확인해주세요.');
        setIsLoading(false);
        return;
      }

      // 3. 유효기간 체크
      if (manager.pairing_code_expires_at) {
        if (new Date() > new Date(manager.pairing_code_expires_at)) {
            Alert.alert('만료됨', '시간이 초과된 코드입니다.\n매니저에게 새 코드를 요청하세요.');
            setIsLoading(false);
            return;
        }
      }

      // 4. 내 정보 업데이트 (연결)
      const { error: updateError } = await supabase
        .from('users')
        .upsert({ 
          id: currentUserId,
          role: 'member',
          manager_id: manager.id,
          name: manager.pending_member_nickname || '어르신', 
          relation_tag: manager.pending_member_relation || '가족',
          nickname: manager.pending_member_nickname || '어르신', // 닉네임 필드도 확실히
          phone: '', 
          updated_at: new Date()
        });

      if (updateError) throw updateError;

      // 5. 성공 -> 알림 확인 누르면 콜백 실행
      Alert.alert('연결 성공!', `${manager.name || '보호자'}님과 연결되었습니다.`, [
        { 
          text: '확인', 
          onPress: () => {
             // 여기서 로딩을 끄지 않고 유지해야 자연스럽게 화면이 넘어갑니다.
             onPairingComplete(manager.name);
          } 
        }
      ]);

    } catch (e: any) {
      console.error(e);
      Alert.alert('오류', e.message || '연결 중 문제가 발생했습니다.');
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
    <View style={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <ChevronLeft color="#c2410c" size={32} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>보호자가 알려준{'\n'}숫자 6개를 눌러주세요</Text>
        
        <View style={styles.codeContainer}>
          {code.map((c, i) => (
            <View key={i} style={[styles.codeBox, c !== '' && styles.codeBoxActive]}>
              <Text style={styles.codeText}>{c}</Text>
            </View>
          ))}
        </View>

        {isLoading && (
          <View style={{ marginBottom: 20, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#ea580c" />
              <Text style={{ marginTop: 10, color: '#666' }}>
                {userInfo ? '보호자와 연결 중입니다...' : '계정을 생성하고 있습니다...'}
              </Text>
          </View>
        )}

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
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.submitBtn, !isComplete && styles.submitBtnDisabled]} 
          onPress={verifyAndLink}
          disabled={!isComplete || isLoading}
        >
          {isLoading ? (
             <ActivityIndicator color="white" />
          ) : (
             <>
               <Text style={styles.submitBtnText}>연결하기</Text>
               {isComplete && <Check color="white" size={24} style={{ marginLeft: 8 }} />}
             </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff7ed' },
  scrollContent: { alignItems: 'center', paddingBottom: 100 },
  backBtn: { alignSelf: 'flex-start', marginTop: 40, marginLeft: 20, padding: 10 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#ea580c', marginTop: 10, marginBottom: 40, textAlign: 'center', lineHeight: 36 },
  codeContainer: { flexDirection: 'row', gap: 10, marginBottom: 40 },
  codeBox: { width: 45, height: 60, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', borderRadius: 10, borderWidth: 2, borderColor: '#fed7aa' },
  codeBoxActive: { borderColor: '#ea580c', backgroundColor: '#fff' },
  codeText: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, justifyContent: 'center', width: 300 },
  keyBtn: { width: 80, height: 80, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', borderRadius: 40, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: {width:0, height:2} },
  keyText: { fontSize: 32, fontWeight: 'bold', color: '#333' },
  delBtn: { backgroundColor: '#fee2e2' },
  footer: { position: 'absolute', bottom: 30, left: 0, right: 0, paddingHorizontal: 20 },
  submitBtn: { 
    backgroundColor: '#ea580c', height: 60, borderRadius: 16, 
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#ea580c', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
  },
  submitBtnDisabled: { backgroundColor: '#fed7aa', shadowOpacity: 0, elevation: 0 },
  submitBtnText: { color: 'white', fontSize: 20, fontWeight: 'bold' }
});