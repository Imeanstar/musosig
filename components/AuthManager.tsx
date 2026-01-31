import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { ChevronLeft, Mail, Lock, User, Phone } from 'lucide-react-native';
import { useUserManagement } from '../hooks/useUserManagement';
import { UserInfo } from '../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PasswordResetModal } from './modals/PasswordResetModal';

interface AuthManagerProps {
  onBack: () => void;
  initialMode?: 'login' | 'signup' | 'social_finish';
  socialUser?: UserInfo | null;
  onSuccess?: () => void;
}

export function AuthManager({ onBack, initialMode = 'login', socialUser, onSuccess }: AuthManagerProps) {
  const { 
    loginWithEmail, signUpWithEmail, updateSocialUserInfo,
    isLoading, setIsLoading 
  } = useUserManagement();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'login' | 'signup' | 'social_finish'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(socialUser?.name || '');
  const [phone, setPhone] = useState(socialUser?.phone || '');
  
  // 🔥 Password Reset Modal State
  const [resetModalVisible, setResetModalVisible] = useState(false);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const isValidEmail = email.includes('@');
  const isValidPw = password.length >= 6;
  const isValidName = name.trim().length >= 2;
  const isValidPhone = phone.replace(/-/g, '').length >= 10;

  const canSubmit = () => {
    if (mode === 'login') return isValidEmail && isValidPw;
    if (mode === 'signup') return isValidEmail && isValidPw && isValidName && isValidPhone;
    if (mode === 'social_finish') return isValidName && isValidPhone;
    return false;
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;

    let success = false;

    if (mode === 'login') {
      success = await loginWithEmail(email, password);
    } else if (mode === 'signup') {
      success = await signUpWithEmail(email, password, name, phone);
    } else if (mode === 'social_finish') {
        if (socialUser?.id) {
            success = await updateSocialUserInfo(socialUser.id, phone, name);
          } else {
            Alert.alert("오류", "사용자 정보를 찾을 수 없습니다.");
            return;
          }
    }   

    if (success && onSuccess) {
      onSuccess();
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={[
        styles.header, 
        { 
          paddingTop: insets.top > 0 ? insets.top : 20,
          height: 60 + (insets.top > 0 ? insets.top : 20)
        }
      ]}>
        {mode !== 'social_finish' ? (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <ChevronLeft size={28} color="#333" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} /> 
        )}
        
        <Text style={styles.headerTitle}>
          {mode === 'login' ? '이메일로 로그인' : 
           mode === 'signup' ? '새 계정 만들기' : '추가 정보 입력'}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
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
          {mode === 'social_finish' && (
            <View style={{marginBottom: 20}}>
              <Text style={{fontSize: 16, color: '#4b5563'}}>
                환영합니다, <Text style={{fontWeight: 'bold'}}>{name}</Text>님!{'\n'}
                서비스 이용을 위해 <Text style={{color: '#ea580c', fontWeight:'bold'}}>전화번호</Text>를 입력해주세요.
              </Text>
            </View>
          )}

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

          {/* 🔥 [Fix] Only show 'Forgot Password' when in 'login' mode */}
          {mode === 'login' && (
            <TouchableOpacity 
              onPress={() => setResetModalVisible(true)}
              style={{ alignSelf: 'flex-end', marginTop: 8 }}
            >
              <Text style={{ color: '#6b7280', fontSize: 13, textDecorationLine: 'underline' }}>
                비밀번호를 잊으셨나요?
              </Text>
            </TouchableOpacity>
          )}

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

          {!canSubmit() && mode === 'social_finish' && (
              <View style={{ marginTop: 10, alignItems: 'center' }}>
                {!isValidName && <Text style={{ color: '#ef4444', fontSize: 13 }}>* 이름을 입력해주세요 (2글자 이상)</Text>}
                {!isValidPhone && <Text style={{ color: '#ef4444', fontSize: 13 }}>* 전화번호를 입력해주세요</Text>}
              </View>
          )}

          {/* 🔥 Modal Component placed correctly */}
          <PasswordResetModal 
            visible={resetModalVisible} 
            onClose={() => setResetModalVisible(false)} 
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, 
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  backBtn: { padding: 8 },
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