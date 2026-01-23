import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator 
} from 'react-native';
import { ChevronLeft, Mail, Lock, User, Phone, CheckCircle, AlertCircle } from 'lucide-react-native';
import { useUserManagement } from '../hooks/useUserManagement';
import { UserInfo } from '../types';

interface AuthManagerProps {
  onBack: () => void;
  initialMode?: 'login' | 'signup' | 'social_finish'; // 👈 모드 추가
  socialUser?: UserInfo | null; // 👈 소셜 유저 정보 받기
}

export function AuthManager({ onBack, initialMode = 'login', socialUser }: AuthManagerProps) {
  const { 
    loginWithEmail, signUpWithEmail, updateSocialUserInfo, // 👈 추가된 함수
    isLoading, setIsLoading 
  } = useUserManagement();

  // 모드 설정 (기본값 or 소셜마무리)
  const [mode, setMode] = useState<'login' | 'signup' | 'social_finish'>(initialMode);

  // 입력 상태 (소셜 유저면 미리 채워넣기)
  const [email, setEmail] = useState(socialUser?.name ? '' : ''); // 소셜은 이메일 대신 ID를 쓸수도 있어서 일단 비움 or socialUser.email 있다면 사용
  const [password, setPassword] = useState('');
  const [name, setName] = useState(socialUser?.name || ''); // 👈 이름 자동 입력
  const [phone, setPhone] = useState(socialUser?.phone || '');

  // 화면 켜지면 로딩 끄기
  useEffect(() => {
    setIsLoading(false);
  }, []);

  // 유효성 검사
  const isValidEmail = email.includes('@');
  const isValidPw = password.length >= 6;
  const isValidName = name.trim().length >= 2;
  const isValidPhone = phone.replace(/-/g, '').length >= 10;

  // 제출 가능 조건
  const canSubmit = () => {
    if (mode === 'login') return isValidEmail && isValidPw;
    if (mode === 'signup') return isValidEmail && isValidPw && isValidName && isValidPhone;
    if (mode === 'social_finish') return isValidName && isValidPhone; // 👈 소셜은 이름/전화번호만 봄
    return false;
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;

    if (mode === 'login') {
      await loginWithEmail(email, password);
    } else if (mode === 'signup') {
      await signUpWithEmail(email, password, name, phone);
    } else if (mode === 'social_finish') {
      // 🆕 소셜 추가 정보 저장
      const success = await updateSocialUserInfo(phone, name);
      // 성공하면 index.tsx에서 자동으로 메인으로 이동시킴
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        {/* 소셜 모드일 땐 뒤로가기 없애거나 로그아웃 처리 해야함 (여기선 일단 둠) */}
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <ChevronLeft size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {mode === 'login' ? '이메일로 로그인' : 
           mode === 'signup' ? '새 계정 만들기' : '추가 정보 입력'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* 탭 전환 (소셜 모드일 땐 숨김) */}
        {mode !== 'social_finish' && (
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, mode === 'login' && styles.activeTab]}
              onPress={() => setMode('login')}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.activeTabText]}>로그인</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, mode === 'signup' && styles.activeTab]}
              onPress={() => setMode('signup')}
            >
              <Text style={[styles.tabText, mode === 'signup' && styles.activeTabText]}>회원가입</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.form}>
          {/* 소셜 모드 안내 문구 */}
          {mode === 'social_finish' && (
            <View style={{marginBottom: 20}}>
              <Text style={{fontSize: 16, color: '#4b5563'}}>
                환영합니다, <Text style={{fontWeight: 'bold'}}>{name}</Text>님!{'\n'}
                서비스 이용을 위해 <Text style={{color: '#ea580c', fontWeight:'bold'}}>전화번호</Text>를 입력해주세요.
              </Text>
            </View>
          )}

          {/* 이메일 & 비밀번호 (소셜 모드에선 숨김) */}
          {mode !== 'social_finish' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>이메일 주소</Text>
                <View style={styles.inputWrapper}>
                  <Mail size={20} color="#9ca3af" style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="example@musosik.app"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>비밀번호</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={20} color="#9ca3af" style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="6자리 이상"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>
              </View>
            </>
          )}

          {/* 회원가입 OR 소셜추가정보 필드 */}
          {(mode === 'signup' || mode === 'social_finish') && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>이름 (실명)</Text>
                <View style={styles.inputWrapper}>
                  <User size={20} color="#9ca3af" style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="홍길동"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>전화번호</Text>
                <View style={styles.inputWrapper}>
                  <Phone size={20} color="#9ca3af" style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="010-1234-5678"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>
                {mode === 'social_finish' && (
                   <Text style={styles.descText}>* 이미 가입된 번호는 사용할 수 없습니다.</Text>
                )}
              </View>
            </>
          )}

          {/* 제출 버튼 */}
          <TouchableOpacity 
            style={[styles.submitBtn, !canSubmit() && styles.disabledBtn]}
            onPress={handleSubmit}
            disabled={!canSubmit() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitBtnText}>
                {mode === 'login' ? '로그인하기' : 
                 mode === 'social_finish' ? '시작하기' : '동의하고 가입하기'}
              </Text>
            )}
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { 
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, 
    height: 60, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' 
  },
  backBtn: { padding: 8, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  content: { padding: 24 },
  tabContainer: { 
    flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 12, padding: 4, marginBottom: 32 
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: 'white', elevation: 2 },
  tabText: { fontSize: 16, color: '#6b7280', fontWeight: '600' },
  activeTabText: { color: '#ea580c', fontWeight: 'bold' },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
  inputWrapper: { 
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', 
    borderRadius: 12, paddingHorizontal: 16, height: 56, backgroundColor: '#fff'
  },
  icon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#1f2937', height: '100%' },
  descText: { fontSize: 12, color: '#ea580c', marginTop: 4 },
  submitBtn: { 
    marginTop: 16, backgroundColor: '#ea580c', height: 56, borderRadius: 16, 
    justifyContent: 'center', alignItems: 'center'
  },
  disabledBtn: { backgroundColor: '#d1d5db' },
  submitBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});