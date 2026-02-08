/**
 * MemberPairing.tsx
 * - [수정됨] Alert 대신 CustomAlertModal 사용
 * - [수정됨] 매니저/멤버 연결 로직 안정화
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions, SafeAreaView } from 'react-native'; // Alert 제거
import { ChevronLeft, Delete, Check, ClipboardPaste } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard'; 
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useUserManagement } from '../hooks/useUserManagement';

// 🚨 [추가] 커스텀 모달 import (경로 확인해주세요!)
import CustomAlertModal from './modals/CustomAlertModal';

interface MemberPairingProps {
  onPairingComplete: (managerName: string) => void;
  onBack: () => void;
}

const { width } = Dimensions.get('window');

export function MemberPairing({ onPairingComplete, onBack }: MemberPairingProps) {
  const { userInfo } = useUserManagement();
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  
  // 🚨 [추가] 모달 상태 관리
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'default' as 'default' | 'danger',
    onConfirm: () => {},
    showCancel: false, // 취소 버튼 보일지 여부
    disableBackgroundClose: false
  });

  const insets = useSafeAreaInsets();
  const isComplete = code.every(c => c !== '');

  // 모달 닫기 헬퍼
  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, visible: false }));
  };

  // 모달 띄우기 헬퍼
  // 2. [수정] showModal 함수 업그레이드
  const showModal = (
    title: string, 
    message: string, 
    type: 'default' | 'danger' = 'default', 
    onConfirm: () => void = () => {}, 
    showCancel = false,
    disableBackgroundClose = false // 👈 인자 추가 (기본값 false)
  ) => {
    setModalConfig({
      visible: true,
      title,
      message,
      type,
      onConfirm: () => {
        closeModal();
        onConfirm();
      },
      showCancel,
      disableBackgroundClose // 👈 설정에 저장
    });
  };

  // 📋 붙여넣기 기능
  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    const numbersOnly = text.replace(/[^0-9]/g, '');

    if (numbersOnly.length === 0) {
      showModal("알림", "복사된 내용에 숫자가 없습니다.");
      return;
    }

    const newCodeArr = numbersOnly.slice(0, 6).split('');
    while (newCodeArr.length < 6) {
      newCodeArr.push('');
    }

    setCode(newCodeArr);
    showModal("성공", "코드를 붙여넣었습니다! 😊");
  };

  // 연결 및 검증 로직
  const verifyAndLink = async () => {
    const fullCode = code.join('');
    if (!isComplete) return;

    setIsLoading(true);
    try {
      // 1. 현재 로그인된 유저 ID 가져오기
      let currentUserId = userInfo?.id;
      if (!currentUserId) {
        const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
        if (authError || !authData.user) throw new Error('로그인 실패');
        currentUserId = authData.user.id;
      }

      // 2. 코드 주인(매니저) 찾기
      const { data: targetUser, error: searchError } = await supabase
        .from('users')
        .select('*')
        .eq('pairing_code', fullCode)
        .maybeSingle();

      if (searchError || !targetUser) {
        setIsLoading(false);
        showModal('연결 실패', '유효하지 않은 코드입니다.', 'danger');
        return;
      }

      // 3. 상황별 분기 처리

      // [Case A] 매니저와 처음 연결하는 경우 (신규 가입)
      if (targetUser.role === 'manager') {
        
        const { error: updateError } = await supabase.from('users').update({ 
            role: 'member',
            manager_id: targetUser.id,
            name: targetUser.pending_member_nickname || '가족', 
            nickname: targetUser.pending_member_nickname,
            relation_tag: targetUser.pending_member_relation,
            updated_at: new Date()
        }).eq('id', currentUserId);

        if (updateError) throw updateError;
        
        // 성공 모달 -> 확인 누르면 이동
        showModal(
          '연결 성공', 
          `"${targetUser.name}"님과 연결되었습니다!`, 
          'default', 
          () => onPairingComplete(targetUser.name),
          false, 
          true // 👈 disableBackgroundClose = true
        );
      } 
      
      // [Case B] 기존 멤버 계정을 복구하는 경우 (재연결)
      else if (targetUser.role === 'member') {
        const { error: rpcError } = await supabase.rpc('migrate_member_history', {
          old_member_id: targetUser.id,  
          new_member_id: currentUserId   
        });

        if (rpcError) throw rpcError;

        showModal(
          '재연결 성공', 
          `"${targetUser.name}"님의 기록을 모두 불러왔습니다!`, 
          'default', 
          () => onPairingComplete('보호자'),
          false,
          true // 👈 disableBackgroundClose = true
        );
      }

    } catch (e: any) {
      console.error("Pairing Error:", e);
      showModal(
        '오류 발생', 
        e.message || '알 수 없는 오류가 발생했습니다.', 
        'danger'
      );
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

        {/* 메인 컨텐츠 영역 */}
        <View style={styles.content}>
          
          <View style={styles.titleSection}>
            <Text style={styles.title}>보호자가 알려준{'\n'}숫자 6개를 눌러주세요</Text>
            
            <View style={styles.codeContainer}>
              {code.map((c, i) => (
                <View key={i} style={[styles.codeBox, c !== '' && styles.codeBoxActive]}>
                  <Text style={styles.codeText}>{c}</Text>
                </View>
              ))}
            </View>

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

        {/* 🚨 [추가] 커스텀 모달 배치 */}
        <CustomAlertModal
            visible={modalConfig.visible}
            title={modalConfig.title}
            message={modalConfig.message}
            type={modalConfig.type}
            onConfirm={modalConfig.onConfirm}
            // 👇 여기가 핵심입니다!
            onClose={() => {
              // '배경 닫기 금지'가 켜져 있으면 -> 아무것도 안 함 (무시)
              if (modalConfig.disableBackgroundClose) return;
              
              // 아니면 -> 닫기 실행
              closeModal();
            }}
            confirmText="확인" // 성공 시엔 '확인'이나 '시작하기'가 됨
        />

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff7ed' },
  container: { flex: 1, position: 'relative' }, 
  backBtn: { marginTop: 40, marginLeft: 20, padding: 10, alignSelf: 'flex-start' },
  content: { flex: 1, justifyContent: 'space-evenly', alignItems: 'center', paddingBottom: 20 },
  titleSection: { alignItems: 'center' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#ea580c', textAlign: 'center', lineHeight: 36, marginBottom: 30 },
  codeContainer: { flexDirection: 'row', gap: 8 },
  codeBox: { width: 45, height: 60, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', borderRadius: 10, borderWidth: 2, borderColor: '#fed7aa' },
  codeBoxActive: { borderColor: '#ea580c', backgroundColor: '#fff' },
  codeText: { fontSize: 24, fontWeight: 'bold', color: '#333' },
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

  // 하단 버튼
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