import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert 
} from 'react-native';
import { ChevronLeft, Mail, Lock, User, Phone, CheckCircle, AlertCircle } from 'lucide-react-native';
import { useUserManagement } from '../hooks/useUserManagement';

interface AuthManagerProps {
  onBack: () => void;
  // onLogin prop은 이제 내부에서 훅을 직접 쓰므로 제거해도 되지만, 
  // 기존 코드 호환성을 위해 남겨두거나 flow에 따라 조정합니다.
  onLogin?: (name: string, phone: string) => Promise<boolean>; 
}

export function AuthManager({ onBack }: AuthManagerProps) {
  const { loginWithEmail, signUpWithEmail, isLoading } = useUserManagement();

  // 모드: 'login' | 'signup'
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  // 입력 상태
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // 유효성 검사 (간단 버전)
  const isValidEmail = email.includes('@') && email.includes('.');
  const isValidPw = password.length >= 6;
  const isValidName = name.trim().length >= 2;
  const isValidPhone = phone.replace(/-/g, '').length >= 10;

  // 버튼 활성화 조건
  const canSubmit = mode === 'login' 
    ? (isValidEmail && isValidPw)
    : (isValidEmail && isValidPw && isValidName && isValidPhone);

  const handleSubmit = async () => {
    if (!canSubmit) return;

    if (mode === 'login') {
      // 로그인 시도
      const success = await loginWithEmail(email, password);
      if (!success) {
        // 실패 시 처리는 훅 내부 Alert에서 함
      }
    } else {
      // 회원가입 시도
      const success = await signUpWithEmail(email, password, name, phone);
      if (success) {
        // 성공 시 자동으로 로그인 처리됨 (hook 로직)
      }
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <ChevronLeft size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {mode === 'login' ? '이메일로 로그인' : '새 계정 만들기'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* 탭 전환 (로그인 <-> 회원가입) */}
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

        <View style={styles.form}>
          {/* 이메일 (공통) */}
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
              {email.length > 0 && (
                isValidEmail 
                  ? <CheckCircle size={18} color="#10b981" />
                  : <AlertCircle size={18} color="#ef4444" />
              )}
            </View>
          </View>

          {/* 비밀번호 (공통) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>비밀번호</Text>
            <View style={styles.inputWrapper}>
              <Lock size={20} color="#9ca3af" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="6자리 이상 입력"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              {password.length > 0 && (
                isValidPw 
                  ? <CheckCircle size={18} color="#10b981" />
                  : <Text style={styles.helperText}>{password.length}/6</Text>
              )}
            </View>
          </View>

          {/* 회원가입 전용 필드 */}
          {mode === 'signup' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>이름 (실명)</Text>
                <View style={styles.inputWrapper}>
                  <User size={20} color="#9ca3af" style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="홍길동"
                    value={name}
                    onChangeText={setName}
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
                <Text style={styles.descText}>* 아이디/비밀번호 찾기에 사용됩니다.</Text>
              </View>
            </>
          )}

          {/* 제출 버튼 */}
          <TouchableOpacity 
            style={[styles.submitBtn, !canSubmit && styles.disabledBtn]}
            onPress={handleSubmit}
            disabled={!canSubmit || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitBtnText}>
                {mode === 'login' ? '로그인하기' : '동의하고 가입하기'}
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
  activeTab: { backgroundColor: 'white', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2 },
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
  helperText: { fontSize: 12, color: '#9ca3af' },
  descText: { fontSize: 12, color: '#9ca3af', marginTop: 4 },

  submitBtn: { 
    marginTop: 16, backgroundColor: '#ea580c', height: 56, borderRadius: 16, 
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#ea580c', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8
  },
  disabledBtn: { backgroundColor: '#d1d5db', shadowOpacity: 0 },
  submitBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});