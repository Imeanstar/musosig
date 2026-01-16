// app/index.tsx - Premium/Free 비즈니스 모델 구현 (치매 예방 수학 문제)
import { styles } from './styles';
import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ActivityIndicator, ScrollView, Alert, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { Settings, Crown, FileText, Lock } from 'lucide-react-native';
import { LegalModal } from '@/components/LegalModal';

interface UserInfo {
  user_id: string;
  name: string;
  phone: string;
  emergency_contacts: string[];
  is_premium: boolean;
}

export default function Index() {
  const [isChecked, setIsChecked] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  
  // 모달 상태
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showMathModal, setShowMathModal] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [resetStep, setResetStep] = useState(0); // 0: 목록, 1: 초기화 확인중
  
  // 로딩 상태
  const [isLoading, setIsLoading] = useState(true);

  // 입력 폼 상태
  const [registerName, setRegisterName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [emergencyContacts, setEmergencyContacts] = useState<string[]>([]);
  const [newContact, setNewContact] = useState('');
  
  // 수학 문제 상태
  const [mathProblem, setMathProblem] = useState({ num1: 0, num2: 0, answer: 0 });
  const [mathUserAnswer, setMathUserAnswer] = useState('');
  
  // 법률 문서 상태
  const [legalUrl, setLegalUrl] = useState('');
  const [legalTitle, setLegalTitle] = useState('');

  // 앱 시작 시 실행
  useEffect(() => {
    checkUserInfo();
  }, []);

  const checkUserInfo = async () => {
    try {
      setIsLoading(true);
      const storedUserId = await AsyncStorage.getItem('user_id');
      
      if (!storedUserId) {
        setShowRegisterModal(true);
      } else {
        const storedName = await AsyncStorage.getItem('user_name');
        const storedPhone = await AsyncStorage.getItem('user_phone');
        const storedContacts = await AsyncStorage.getItem('emergency_contacts');
        const storedIsPremium = await AsyncStorage.getItem('is_premium');
        
        setUserInfo({
          user_id: storedUserId,
          name: storedName || '',
          phone: storedPhone || '',
          emergency_contacts: storedContacts ? JSON.parse(storedContacts) : [],
          is_premium: storedIsPremium === 'true',
        });

        await checkTodayCheckIn(storedUserId);
      }
    } catch (error) {
      console.error('사용자 정보 확인 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkTodayCheckIn = async (userId: string) => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayStartISO = todayStart.toISOString();

      const { data, error } = await supabase
        .from('check_ins')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', todayStartISO)
        .limit(1);

      if (!error) {
        setIsChecked(data && data.length > 0);
      }
    } catch (error) {
      console.error('출석 확인 중 오류:', error);
    }
  };

  // 회원가입 및 로그인 처리
  const handleRegister = async () => {
    if (!registerName.trim() || !registerPhone.trim()) {
      Alert.alert("입력 오류", "이름과 전화번호를 모두 입력해주세요.");
      return;
    }

    setIsLoading(true);

    try {
      const { data: existingUsers, error: selectError } = await supabase
        .from('users')
        .select('*')
        .eq('phone', registerPhone.trim())
        .limit(1);

      if (selectError) throw selectError;

      let userData;
      let isNewUser = false;

      if (existingUsers && existingUsers.length > 0) {
        const existingUser = existingUsers[0];
        if (existingUser.name !== registerName.trim()) {
          const { data: updatedUser } = await supabase
            .from('users')
            .update({ name: registerName.trim() })
            .eq('id', existingUser.id)
            .select()
            .single();
          userData = updatedUser || existingUser;
        } else {
          userData = existingUser;
        }
      } else {
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            name: registerName.trim(),
            phone: registerPhone.trim(),
            emergency_contacts: [],
          })
          .select()
          .single();

        if (insertError) throw insertError;
        userData = newUser;
        isNewUser = true;
      }

      const contacts = userData.emergency_contacts || [];
      const isPremium = userData.is_premium || false;
      await AsyncStorage.setItem('user_id', userData.id);
      await AsyncStorage.setItem('user_name', userData.name);
      await AsyncStorage.setItem('user_phone', userData.phone);
      await AsyncStorage.setItem('emergency_contacts', JSON.stringify(contacts));
      await AsyncStorage.setItem('is_premium', String(isPremium));

      setUserInfo({
        user_id: userData.id,
        name: userData.name,
        phone: userData.phone,
        emergency_contacts: contacts,
        is_premium: isPremium,
      });

      setShowRegisterModal(false);
      
      const message = isNewUser ? "환영합니다!" : "다시 오셨군요!";
      Alert.alert(message, `${userData.name}님, 시작합니다.`);

    } catch (error) {
      console.error('등록 에러:', error);
      Alert.alert("오류", "등록 중 문제가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 수학 문제 생성 (두 자리 수 덧셈)
  const generateMathProblem = () => {
    const num1 = Math.floor(Math.random() * 90) + 10; // 10~99
    const num2 = Math.floor(Math.random() * 90) + 10; // 10~99
    const answer = num1 + num2;
    setMathProblem({ num1, num2, answer });
    setMathUserAnswer('');
  };

  // Premium 모드 토글 (테스트용)
  const handleTogglePremium = async () => {
    if (!userInfo) return;
    try {
      const newPremiumStatus = !userInfo.is_premium;
      
      const { error } = await supabase
        .from('users')
        .update({ is_premium: newPremiumStatus })
        .eq('id', userInfo.user_id);

      if (error) throw error;

      await AsyncStorage.setItem('is_premium', String(newPremiumStatus));
      setUserInfo({ ...userInfo, is_premium: newPremiumStatus });
      
      Alert.alert(
        "변경 완료", 
        newPremiumStatus ? "프리미엄 모드가 활성화되었습니다. 🌟" : "무료 모드로 전환되었습니다."
      );
    } catch (error) {
      Alert.alert("오류", "설정 변경에 실패했습니다.");
    }
  };

  // 메인 버튼 클릭 핸들러 (Premium/Free 분기)
  const handleCheckInBtnPress = () => {
    if (!userInfo) return;
    
    if (userInfo.is_premium) {
      // Premium: 수학 문제 풀기
      generateMathProblem();
      setShowMathModal(true);
    } else {
      // Free: 바로 출석
      handleCheckIn();
    }
  };

  // 수학 문제 정답 확인
  const handleMathSubmit = () => {
    const userAnswerNum = parseInt(mathUserAnswer);
    
    if (isNaN(userAnswerNum)) {
      Alert.alert("알림", "숫자를 입력해주세요.");
      return;
    }
    
    if (userAnswerNum === mathProblem.answer) {
      // 정답!
      setShowMathModal(false);
      handleCheckIn();
    } else {
      // 오답
      Alert.alert("틀렸습니다", "다시 시도해보세요! 💪");
      setMathUserAnswer('');
    }
  };

  // 설정 모달 열기
  const handleOpenSettings = () => {
    if (userInfo) {
      setResetStep(0); // 초기화 화면 상태 리셋
      setEmergencyContacts([...userInfo.emergency_contacts]);
      setShowSettingsModal(true);
    }
  };

  // 법률 문서 열기
  const handleOpenLegalDoc = (type: 'terms' | 'privacy') => {
    if (type === 'terms') {
      setLegalTitle('이용약관');
      // TODO: 여기에 노션 링크를 넣으세요 (예: https://notion.so/your-terms-page)
      setLegalUrl('https://google.com'); // 테스트용 URL
    } else {
      setLegalTitle('개인정보처리방침');
      // TODO: 여기에 노션 링크를 넣으세요 (예: https://notion.so/your-privacy-page)
      setLegalUrl('https://google.com'); // 테스트용 URL
    }
    setShowLegalModal(true);
  };

  const handleAddContact = () => {
    if (!newContact.trim()) return;
    if (emergencyContacts.length >= 3) {
      Alert.alert("알림", "최대 3명까지만 등록 가능합니다.");
      return;
    }
    setEmergencyContacts([...emergencyContacts, newContact.trim()]);
    setNewContact('');
  };

  const handleRemoveContact = (index: number) => {
    const updated = emergencyContacts.filter((_, i) => i !== index);
    setEmergencyContacts(updated);
  };

  const handleSaveContacts = async () => {
    if (!userInfo) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({ emergency_contacts: emergencyContacts })
        .eq('id', userInfo.user_id);

      if (error) throw error;

      await AsyncStorage.setItem('emergency_contacts', JSON.stringify(emergencyContacts));
      
      setUserInfo({ ...userInfo, emergency_contacts: emergencyContacts });
      setShowSettingsModal(false);
      setResetStep(0);
      Alert.alert("완료", "비상연락망이 저장되었습니다.");
    } catch (error) {
      Alert.alert("오류", "저장에 실패했습니다.");
    }
  };

  // ✅ [수정됨] Alert 대신 모달 내부 UI로 처리하는 초기화 함수
  const handleConfirmReset = async () => {
    // 1. 즉시 로딩 상태로 전환 (모달 자동 닫힘)
    setIsLoading(true);
    setShowSettingsModal(false);

    try {
      console.log("🔴 초기화 시작");
      // 2. 데이터 삭제
      await AsyncStorage.clear();
      
      // 3. 상태 완전 초기화
      setUserInfo(null);
      setEmergencyContacts([]);
      setIsChecked(false);
      setRegisterName('');
      setRegisterPhone('');
      setNewContact('');
      setResetStep(0);

      console.log("🔴 초기화 완료, 가입창 대기");

      // 4. 가입 모달 켜기
      setShowRegisterModal(true);

      // 5. 로딩 해제 (자연스럽게 가입창 노출)
      setTimeout(() => {
        setIsLoading(false); 
      }, 500);

    } catch (error) {
      console.error(error);
      setIsLoading(false);
      Alert.alert("오류", "초기화 실패");
    }
  };

  const handleCheckIn = async () => {
    if (!userInfo) return;
    try {
      const { error } = await supabase.from('check_ins').insert({ user_id: userInfo.user_id });
      if (error) throw error;
      
      await supabase.from('users').update({ last_seen_at: new Date().toISOString() }).eq('id', userInfo.user_id);
      
      setIsChecked(true);
      Alert.alert("성공", "생존 신고 완료! 오늘도 건강하세요.");
    } catch (error) {
      Alert.alert("오류", "저장 실패");
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>잠시만 기다려주세요...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 회원가입 모달 */}
      <Modal visible={showRegisterModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>안부 - 시작하기</Text>
            <Text style={styles.modalSubtitle}>어르신의 정보를 입력해주세요.</Text>
            <Text style={styles.inputLabel}>이름</Text>
            <TextInput style={styles.input} placeholder="예: 홍길동" value={registerName} onChangeText={setRegisterName} />
            <Text style={styles.inputLabel}>전화번호</Text>
            <TextInput style={styles.input} placeholder="예: 010-1234-5678" value={registerPhone} onChangeText={setRegisterPhone} keyboardType="number-pad" />
            <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
              <Text style={styles.registerButtonText}>시작하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 수학 문제 모달 (Premium 전용) */}
      <Modal visible={showMathModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.mathModalContainer}>
            <Text style={styles.mathModalTitle}>🧠 치매 예방 두뇌 훈련</Text>
            <Text style={styles.mathModalSubtitle}>문제를 풀고 출석해주세요!</Text>
            <Text style={styles.mathProblem}>
              {mathProblem.num1} + {mathProblem.num2} = ?
            </Text>
            <TextInput
              style={styles.mathInput}
              placeholder="정답 입력"
              value={mathUserAnswer}
              onChangeText={setMathUserAnswer}
              keyboardType="number-pad"
              autoFocus
            />
            <TouchableOpacity style={styles.mathSubmitButton} onPress={handleMathSubmit}>
              <Text style={styles.mathSubmitButtonText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 설정 모달 (Alert 제거 버전) */}
      <Modal visible={showSettingsModal} animationType="slide" transparent={true} onRequestClose={() => setShowSettingsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.settingsModalContainer}>
            
            {/* 상태에 따라 다른 화면 보여주기 */}
            {resetStep === 0 ? (
              // [화면 A] 평범한 설정 화면
              <>
                <Text style={styles.modalTitle}>설정</Text>
                
                {/* Premium 모드 테스트 스위치 */}
                <View style={styles.premiumTestRow}>
                  <Text style={styles.premiumTestLabel}>👑 프리미엄 모드 (테스트)</Text>
                  <Switch
                    value={userInfo?.is_premium || false}
                    onValueChange={handleTogglePremium}
                    trackColor={{ false: '#d1d5db', true: '#fbbf24' }}
                    thumbColor={userInfo?.is_premium ? '#f59e0b' : '#f3f4f6'}
                  />
                </View>
                
                <Text style={styles.modalSubtitle}>비상연락망 관리 (최대 3명)</Text>
                <ScrollView style={styles.contactsList}>
                  {emergencyContacts.map((contact, index) => (
                    <View key={index} style={styles.contactItem}>
                      <Text style={styles.contactText}>{contact}</Text>
                      <TouchableOpacity onPress={() => handleRemoveContact(index)}>
                        <Text style={styles.removeButton}>삭제</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
                {emergencyContacts.length < 3 && (
                  <View style={styles.addContactRow}>
                    <TextInput style={[styles.input, styles.addContactInput]} placeholder="보호자 전화번호" value={newContact} onChangeText={setNewContact} keyboardType="number-pad" />
                    <TouchableOpacity style={styles.addButton} onPress={handleAddContact}>
                      <Text style={styles.addButtonText}>추가</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <View style={styles.settingsModalButtons}>
                  <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setShowSettingsModal(false)}>
                    <Text style={styles.cancelButtonText}>닫기</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleSaveContacts}>
                    <Text style={styles.saveButtonText}>저장</Text>
                  </TouchableOpacity>
                </View>
                
                {/* 법률 문서 메뉴 */}
                <View style={styles.legalMenuSection}>
                  <TouchableOpacity 
                    style={styles.legalMenuItem} 
                    onPress={() => handleOpenLegalDoc('terms')}
                  >
                    <FileText size={20} color="#374151" />
                    <Text style={styles.legalMenuText}>📄 이용약관</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.legalMenuItem} 
                    onPress={() => handleOpenLegalDoc('privacy')}
                  >
                    <Lock size={20} color="#374151" />
                    <Text style={styles.legalMenuText}>🔒 개인정보처리방침</Text>
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity style={styles.resetButton} onPress={() => setResetStep(1)}>
                  <Text style={styles.resetButtonText}>데이터 초기화 (처음으로)</Text>
                </TouchableOpacity>
              </>
            ) : (
              // [화면 B] 초기화 확인 화면 (Alert 대체)
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Text style={[styles.modalTitle, { color: '#ef4444' }]}>⚠️ 경고</Text>
                <Text style={[styles.modalSubtitle, { marginBottom: 30 }]}>
                  정말 모든 데이터를 삭제하고{'\n'}처음 화면으로 돌아가시겠습니까?
                </Text>
                <View style={styles.settingsModalButtons}>
                  <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setResetStep(0)}>
                    <Text style={styles.cancelButtonText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#ef4444' }]} onPress={handleConfirmReset}>
                    <Text style={[styles.saveButtonText, { fontWeight: '900' }]}>네, 초기화합니다</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

          </View>
        </View>
      </Modal>

      {/* 법률 문서 모달 */}
      <LegalModal
        visible={showLegalModal}
        onClose={() => setShowLegalModal(false)}
        url={legalUrl}
        title={legalTitle}
      />

      {/* 메인 화면 */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.dateText}>{new Date().toLocaleDateString()}</Text>
            <Text style={styles.greetingText}>{userInfo ? `${userInfo.name}님, 안녕하세요!` : '안녕하세요!'}</Text>
            {userInfo?.is_premium && (
              <View style={styles.premiumBadge}>
                <Crown size={16} color="#92400e" fill="#fbbf24" />
                <Text style={styles.premiumBadgeText}>Premium 사용 중</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={handleOpenSettings} style={styles.settingsIcon}>
            <Settings size={28} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity 
        onPress={handleCheckInBtnPress} 
        disabled={isChecked} 
        style={[styles.checkButton, isChecked ? styles.buttonChecked : styles.buttonUnchecked]}
      >
        <Text style={styles.buttonText}>{isChecked ? "완료" : "생존 신고"}</Text>
      </TouchableOpacity>
    </View>
  );
}
