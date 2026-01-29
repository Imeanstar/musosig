import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, 
  Dimensions, ActivityIndicator, Modal, RefreshControl, Alert, Linking 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ChevronRight, Plus, Settings, User, 
  Bell, LogOut, RefreshCw, X, ArrowRight, Copy, FileText, 
  Mail, Trash2, Info, Crown
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { UserInfo } from '../types';
// 👇 [추가] 클립보드 기능 임포트
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SubscriptionModal } from './modals/SubscriptionModal'; // 👈 추가
import { useUserManagement } from '../hooks/useUserManagement';

interface ManagerMainProps {
  onBack: () => void;
  userInfo: UserInfo;
}

interface MemberData extends UserInfo {
  last_check_in?: string;
  is_safe_today?: boolean;
}

const { width } = Dimensions.get('window');

export function ManagerMain({ onBack, userInfo }: ManagerMainProps) {
  const insets = useSafeAreaInsets();
  const { deleteAccount } = useUserManagement();
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'notifications' | 'profile'>('list');
  const [members, setMembers] = useState<MemberData[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [checkInLogs, setCheckInLogs] = useState<Set<string>>(new Set());

  // 초대 코드 관련 상태
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCode, setInviteCode] = useState<string>('');
  const [isCodeLoading, setIsCodeLoading] = useState(false);
  
  // 👇 [추가] 복사 알림 상태
  const [isCopied, setIsCopied] = useState(false);

  // 초대 정보 입력 상태
  const [targetNickname, setTargetNickname] = useState('');
  const [targetRelation, setTargetRelation] = useState('');
  const [step, setStep] = useState<'input' | 'show'>('input');

  useEffect(() => {
    if (userInfo) fetchMembers();
  }, [userInfo]);

  useEffect(() => {
    if (selectedMember) fetchCheckInLogs(selectedMember.id);
  }, [selectedMember, currentDate]);

  // 🔥 [추가] 클립보드 복사 함수
  const handleCopyCode = async () => {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
    setIsCopied(true);
    
    // 2초 뒤에 알림 문구 사라지게
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  const generateNewCode = async () => {
    if (!userInfo) return;
    if (step === 'input' && (!targetNickname.trim() || !targetRelation.trim())) {
      Alert.alert('정보 부족', '호칭과 관계를 모두 입력해주세요.');
      return;
    }

    setIsCodeLoading(true);

    try {
      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { error } = await supabase
        .from('users')
        .update({ 
          pairing_code: newCode,
          pairing_code_expires_at: expiresAt,
          pending_member_nickname: targetNickname,
          pending_member_relation: targetRelation
        })
        .eq('id', userInfo.id);

      if (error) throw error;

      setInviteCode(newCode);
      setStep('show');
    } catch (e) {
      console.error(e);
      Alert.alert('오류', '코드를 생성하지 못했습니다.');
    } finally {
      setIsCodeLoading(false);
    }
  };

  // 기기 재연결 코드 생성 함수 (RPC 호출)
  const generateReLinkCode = async () => {
    if (!selectedMember) return;
    setIsCodeLoading(true);
    try {
      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  
      // 1. RPC 함수 호출
      const { error } = await supabase.rpc('generate_relink_code', {
        target_member_id: selectedMember.id,
        new_code: newCode,
        expires_at: expiresAt
      });
  
      if (error) throw error;
  
      setInviteCode(newCode);
      setStep('show'); 
      setShowInviteModal(true);
      
    } catch (e: any) {
      console.error(e);
      Alert.alert("오류", "코드를 생성하지 못했습니다. (권한 오류 등)");
    } finally {
      setIsCodeLoading(false);
    }
  };

  const handleOpenInvite = () => {
    setStep('input');
    setTargetNickname('');
    setTargetRelation('');
    setShowInviteModal(true);
    setIsCopied(false); // 초기화
  };

  const fetchMembers = async () => {
    if (!userInfo) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('manager_id', userInfo.id);

      if (error) throw error;

      const todayStr = new Date().toISOString().split('T')[0];
      
      const membersWithStatus = await Promise.all((data || []).map(async (member) => {
        const { data: logs } = await supabase
          .from('check_in_logs')
          .select('created_at')
          .eq('member_id', member.id)
          .gte('created_at', `${todayStr}T00:00:00`)
          .limit(1);

        return {
          ...member,
          is_safe_today: logs && logs.length > 0,
          role: 'member' as const
        };
      }));

      setMembers(membersWithStatus);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCheckInLogs = async (memberId: string) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    const { data } = await supabase
      .from('check_in_logs')
      .select('created_at')
      .eq('member_id', memberId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (data) {
      const logSet = new Set<string>();
      data.forEach(log => logSet.add(log.created_at.split('T')[0]));
      setCheckInLogs(logSet);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMembers();
  }, []);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return { 
      daysInMonth: new Date(year, month + 1, 0).getDate(), 
      startingDayOfWeek: new Date(year, month, 1).getDay() 
    };
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <LinearGradient colors={['#3b82f6', '#14b8a6']} style={styles.header}>
        <View style={styles.headerContent}>
          
          {/* 1. 왼쪽: 타이틀 */}
          <Text style={styles.headerTitle}>희소식</Text>

          {/* 2. 오른쪽 그룹: (프리미엄 버튼 + 멤버 추가 버튼)을 묶음 */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            
            {/* 👑 프리미엄 버튼 (조건: 프리미엄 아닐 때만 노출) */}
            {!userInfo?.is_premium && (
              <TouchableOpacity 
                onPress={() => setShowPremiumModal(true)}
                style={{
                  marginRight: 8, // 멤버 추가 버튼과의 간격
                  backgroundColor: 'rgba(255,255,255,0.2)', 
                  paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                  flexDirection: 'row', alignItems: 'center',
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)'
                }}
              >
                <Crown size={14} color="#fbbf24" fill="#fbbf24" />
                <Text style={{color:'white', fontWeight:'bold', marginLeft: 4, fontSize: 11}}>UPGRADE</Text>
              </TouchableOpacity>
            )}

            {/* ➕ 멤버 추가 버튼 */}
            <TouchableOpacity style={styles.addButton} onPress={handleOpenInvite}>
              <Plus color="white" size={20} />
              <Text style={styles.addButtonText}>멤버 추가</Text>
            </TouchableOpacity>
            
          </View>

        </View>
      </LinearGradient>

      {/* 메인 컨텐츠 */}
      <View style={styles.content}>
        
        {/* 1. 멤버 목록 */}
        {activeTab === 'list' && !selectedMember && (
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            <Text style={styles.sectionTitle}>내 멤버 목록</Text>
            {members.length === 0 && !isLoading ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyText}>아직 등록된 멤버가 없습니다.</Text>
                <Text style={styles.emptySubText}>우측 상단 '멤버 추가'를 눌러{'\n'}초대 코드를 확인하세요!</Text>
              </View>
            ) : (
              members.map((member) => (
                <TouchableOpacity
                  key={member.id}
                  style={styles.memberCard}
                  onPress={() => setSelectedMember(member)}
                  activeOpacity={0.9}
                >
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.nickname || member.name} 님</Text>
                    <Text style={styles.memberStatus}>
                      {member.is_safe_today 
                        ? '오늘 안부를 전했습니다 ✅' 
                        : '아직 소식이 없습니다 ⏳'}
                    </Text>
                  </View>
                  <View style={[
                    styles.statusIcon, 
                    { backgroundColor: member.is_safe_today ? '#dcfce7' : '#fee2e2' }
                  ]}>
                    <Text style={{ fontSize: 24 }}>
                      {member.is_safe_today ? '😊' : '🥺'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        )}

        {/* 2. 멤버 상세 (캘린더) */}
        {activeTab === 'list' && selectedMember && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <TouchableOpacity onPress={() => setSelectedMember(null)} style={styles.backButton}>
              <ChevronLeft size={20} color="#2563eb" />
              <Text style={styles.backButtonText}>목록으로</Text>
            </TouchableOpacity>

            <View style={styles.calendarCard}>
              <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.arrowBtn}>
                  <ChevronLeft size={24} color="#374151" />
                </TouchableOpacity>
                <Text style={styles.monthTitle}>
                  {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
                </Text>
                <TouchableOpacity onPress={() => changeMonth(1)} style={styles.arrowBtn}>
                  <ChevronRight size={24} color="#374151" />
                </TouchableOpacity>
              </View>

              <View style={styles.memberSummary}>
                <Text style={styles.summaryTitle}>
                   {selectedMember.nickname || selectedMember.name}님의 기록
                </Text>
              </View>

              <View style={styles.weekRow}>
                {['일', '월', '화', '수', '목', '금', '토'].map(d => (
                  <Text key={d} style={styles.weekDayText}>{d}</Text>
                ))}
              </View>

              <View style={styles.daysGrid}>
                {/* 1. 빈 칸 채우기 (해당 월 시작 요일까지) */}
                {Array.from({ length: getDaysInMonth(currentDate).startingDayOfWeek }).map((_, i) => (
                  <View key={`empty-${i}`} style={styles.dayCell} />
                ))}

                {/* 2. 날짜 채우기 */}
                {Array.from({ length: getDaysInMonth(currentDate).daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  
                  // 날짜 키 생성 (YYYY-MM-DD)
                  const yearStr = currentDate.getFullYear();
                  const monthStr = String(currentDate.getMonth() + 1).padStart(2, '0');
                  const dayStr = String(day).padStart(2, '0');
                  const dateKey = `${yearStr}-${monthStr}-${dayStr}`;

                  // 오늘 날짜 구하기 (비교용)
                  const now = new Date();
                  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

                  // 상태 판별
                  const isChecked = checkInLogs.has(dateKey); // 출석함
                  const isFuture = dateKey > todayKey; // 미래임
                  const isMissed = !isChecked && !isFuture; // 출석 안 했고, 과거/오늘임 (빨강)

                  return (
                    <View 
                      key={day} 
                      style={[
                        styles.dayCell, 
                        isChecked && styles.checkedDay, // 초록색
                        isMissed && styles.missedDay    // 빨간색 (추가됨)
                      ]}
                    >
                      <Text 
                        style={[
                          styles.dayText, 
                          isChecked && styles.checkedDayText,
                          isMissed && styles.missedDayText // 빨간 글씨 (추가됨)
                        ]}
                      >
                        {day}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* 기기 재연결 섹션 */}
            <View style={styles.relinkCard}>
              <Text style={styles.relinkTitle}>기기 변경 / 재설치</Text>
              <Text style={styles.relinkDesc}>
                멤버가 앱을 삭제했거나 기기를 바꿨나요?{'\n'}
                아래 버튼을 눌러 연결 코드를 다시 발급해주세요.{'\n'}
                (기존 기록이 유지됩니다)
              </Text>
              <TouchableOpacity 
                style={styles.relinkButton} 
                onPress={generateReLinkCode}
              >
                <RefreshCw size={20} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.relinkButtonText}>재연결 코드 발급</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* 3. 알림 탭 */}
        {activeTab === 'notifications' && (
          <View style={styles.centerTab}>
            <Bell size={48} color="#cbd5e1" />
            <Text style={styles.tabPlaceholderText}>알림 설정 기능 준비 중</Text>
          </View>
        )}

        {/* 4. 프로필 탭 (설정 및 계정 관리) */}
        {activeTab === 'profile' && (
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            
            {/* 상단 프로필 카드 (디자인 개선) */}
            <View style={styles.profileCard}>
              <View style={styles.profileRow}>
                <View style={styles.profileIconCircle}>
                  <User size={32} color="white" />
                </View>
                <View style={{ marginLeft: 16, flex: 1 }}>
                  <Text style={styles.profileName}>{userInfo?.name || '사용자'} 님</Text>
                  <Text style={styles.profilePhone}>{userInfo?.phone}</Text>
                </View>
              </View>

              <View style={[styles.divider, { marginVertical: 16 }]} />

              {/* 👇 [핵심] 멤버십 상태 표시 (차별적인 문구 개선) */}
              <View style={styles.membershipBox}>
                <View>
                  <Text style={styles.membershipLabel}>현재 이용 중인 플랜</Text>
                  <Text style={[
                    styles.membershipValue, 
                    userInfo?.is_premium ? { color: '#d97706' } : { color: '#4b5563' }
                  ]}>
                    {userInfo?.is_premium ? '안심 보호 중 🛡️' : '베이직 플랜'}
                  </Text>
                </View>

                {/* 프리미엄이 아닐 때만 '업그레이드' 버튼 노출 */}
                {!userInfo?.is_premium && (
                  <TouchableOpacity 
                    style={styles.upgradeBtn}
                    onPress={() => setShowPremiumModal(true)}
                  >
                    <Text style={styles.upgradeBtnText}>혜택 보기</Text>
                    <ChevronRight size={14} color="white" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* 메뉴 섹션 1: 고객 지원 */}
            <Text style={styles.menuSectionTitle}>고객 지원</Text>
            <View style={styles.menuContainer}>
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => Linking.openURL('https://www.notion.so/Musosik-2eabea82a55680c59934db2f27086e62')} 
              >
                <View style={styles.menuItemLeft}>
                  <FileText size={20} color="#4b5563" />
                  <Text style={styles.menuItemText}>서비스 이용약관</Text>
                </View>
                <ChevronRight size={20} color="#9ca3af" />
              </TouchableOpacity>
              
              <View style={styles.divider} />

              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => Linking.openURL('https://www.notion.so/Musosik-2eabea82a55680c59934db2f27086e62')}
              >
                <View style={styles.menuItemLeft}>
                  <Info size={20} color="#4b5563" />
                  <Text style={styles.menuItemText}>개인정보처리방침</Text>
                </View>
                <ChevronRight size={20} color="#9ca3af" />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => Linking.openURL('mailto:support@musosik.app')}
              >
                <View style={styles.menuItemLeft}>
                  <Mail size={20} color="#4b5563" />
                  <Text style={styles.menuItemText}>문의하기 / 버그 신고</Text>
                </View>
                <ChevronRight size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {/* 메뉴 섹션 2: 계정 관리 */}
            <Text style={styles.menuSectionTitle}>계정 관리</Text>
            <View style={styles.menuContainer}>
              {/* 로그아웃 */}
              <TouchableOpacity style={styles.menuItem} onPress={onBack}>
                <View style={styles.menuItemLeft}>
                  <LogOut size={20} color="#4b5563" />
                  <Text style={styles.menuItemText}>로그아웃</Text>
                </View>
                <ChevronRight size={20} color="#9ca3af" />
              </TouchableOpacity>
              
              <View style={styles.divider} />

              {/* 🚨 회원 탈퇴 기능 연결 */}
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  Alert.alert(
                    "정말 떠나시겠어요? 😢",
                    "탈퇴 시 모든 안부 기록과 멤버 연결 정보가 즉시 삭제되며 복구할 수 없습니다.",
                    [
                      { text: "취소", style: "cancel" },
                      { 
                        text: "탈퇴하기", 
                        style: "destructive",
                        onPress: async () => {
                          // 👇 useUserManagement에서 가져온 함수 사용
                          // (ManagerMain 상단에서 const { deleteAccount } = useUserManagement(); 필요)
                          // 지금은 props로 안 넘겨받았을 수 있으니 임시로 Alert 처리하거나
                          // useUserManagement 훅을 여기서 직접 호출해서 써야 합니다.
                          Alert.alert("알림", "회원 탈퇴 기능 연결 필요 (코드 확인해주세요!)"); 
                          
                          // [실제 적용 시 아래 주석 해제]
                          /*
                          const success = await deleteAccount();
                          if (success) {
                             Alert.alert("탈퇴 완료", "그동안 이용해주셔서 감사합니다.");
                             onBack();
                          }
                          */
                        }
                      }
                    ]
                  );
                }}
              >
                <View style={styles.menuItemLeft}>
                  <Trash2 size={20} color="#ef4444" />
                  <Text style={[styles.menuItemText, { color: '#ef4444' }]}>회원 탈퇴</Text>
                </View>
              </TouchableOpacity>
            </View>

            <Text style={styles.versionText}>앱 버전 v1.0.0</Text>
            <View style={{height: 40}} /> 
          </ScrollView>
        )}
      </View>

      {/* 하단 탭바 */}
      <View style={[
        styles.tabBar, 
        { paddingBottom: insets.bottom > 0 ? insets.bottom : 20 } 
      ]}>
        <TouchableOpacity style={styles.tabItem} onPress={() => { setActiveTab('list'); setSelectedMember(null); }}>
          <User size={24} color={activeTab === 'list' ? '#3b82f6' : '#9ca3af'} />
          <Text style={[styles.tabText, activeTab === 'list' && styles.activeTabText]}>내 멤버</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('notifications')}>
          <Settings size={24} color={activeTab === 'notifications' ? '#3b82f6' : '#9ca3af'} />
          <Text style={[styles.tabText, activeTab === 'notifications' && styles.activeTabText]}>설정</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('profile')}>
          <User size={24} color={activeTab === 'profile' ? '#3b82f6' : '#9ca3af'} />
          <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>프로필</Text>
        </TouchableOpacity>
      </View>

      {/* 모달 */}
      <Modal visible={showInviteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeXButton} 
              onPress={() => setShowInviteModal(false)}
            >
              <X size={24} color="#9ca3af" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>멤버 초대하기</Text>

            {/* Step 1: 정보 입력 */}
            {step === 'input' && (
              <View style={{ width: '100%' }}>
                <Text style={styles.modalDesc}>
                  초대할 가족의 정보를 입력해주세요.{'\n'}이 정보로 자동 가입됩니다.
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>멤버 이름 (호칭)</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="예: 우리 엄마, 사랑하는 아들" 
                    value={targetNickname}
                    onChangeText={setTargetNickname}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>나와의 관계</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="예: 부모님, 자녀" 
                    value={targetRelation}
                    onChangeText={setTargetRelation}
                  />
                </View>

                <TouchableOpacity 
                  style={styles.generateButton}
                  onPress={generateNewCode}
                  disabled={isCodeLoading}
                >
                  {isCodeLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Text style={styles.generateButtonText}>초대 코드 만들기</Text>
                      <ArrowRight size={20} color="white" style={{ marginLeft: 8 }} />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Step 2: 코드 확인 (여기가 복사 기능 핵심!) */}
            {step === 'show' && (
              <View style={{ width: '100%', alignItems: 'center' }}>
                <Text style={styles.modalDesc}>
                  숫자 칸을 눌러 코드를 복사하고{'\n'}가족에게 전달해주세요.
                </Text>
                
                <View style={styles.codeRow}>
                   {/* 👇 [수정] 코드를 누르면 복사되도록 TouchableOpacity로 변경 */}
                   <TouchableOpacity 
                     style={styles.codeBox} 
                     onPress={handleCopyCode}
                     activeOpacity={0.7}
                   >
                      <Text style={styles.codeText}>{inviteCode}</Text>
                      {/* 복사 아이콘 추가 (선택사항) */}
                      <Copy size={16} color="#9ca3af" style={{ position: 'absolute', top: 8, right: 8}} />
                   </TouchableOpacity>

                   <TouchableOpacity onPress={generateNewCode} style={styles.refreshBtn}>
                      <RefreshCw size={24} color="#6b7280" />
                   </TouchableOpacity>
                </View>

                {/* 👇 복사 완료 메시지 (애니메이션 효과처럼 나타남) */}
                {isCopied ? (
                  <Text style={styles.copiedMsg}>✅ 클립보드에 복사되었습니다!</Text>
                ) : (
                  <Text style={styles.securityNote}>* 코드는 10분 후 만료됩니다.</Text>
                )}
                
                <TouchableOpacity 
                  style={styles.modalCloseBtn}
                  onPress={() => setShowInviteModal(false)}
                >
                  <Text style={styles.modalCloseText}>확인 완료</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setStep('input')} style={{ marginTop: 16 }}>
                    <Text style={{ color: '#9ca3af', textDecorationLine: 'underline' }}>정보 수정하기</Text>
                </TouchableOpacity>
              </View>
            )}

          </View>
        </View>
      </Modal>
      <SubscriptionModal 
        visible={showPremiumModal} 
        onClose={() => setShowPremiumModal(false)} 
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  addButton: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 8, alignItems: 'center' },
  addButtonText: { color: 'white', marginLeft: 4, fontWeight: '600' },
  content: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 },
  memberCard: { backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 2 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  memberStatus: { fontSize: 14, color: '#6b7280' },
  statusIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyIcon: { fontSize: 60, marginBottom: 20 },
  emptyText: { fontSize: 18, color: '#374151', fontWeight: 'bold' },
  emptySubText: { fontSize: 14, color: '#9ca3af', marginTop: 8, textAlign: 'center', lineHeight: 20 },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backButtonText: { color: '#2563eb', fontSize: 16, marginLeft: 4 },
  calendarCard: { backgroundColor: 'white', borderRadius: 16, padding: 20, elevation: 3 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  monthTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  arrowBtn: { padding: 8 },
  memberSummary: { backgroundColor: '#eff6ff', padding: 12, borderRadius: 8, marginBottom: 20 },
  summaryTitle: { color: '#1e40af', fontWeight: '600', textAlign: 'center' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  weekDayText: { width: (width - 80) / 7, textAlign: 'center', color: '#6b7280', fontWeight: 'bold' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: (width - 80) / 7, height: (width - 80) / 7, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  dayText: { fontSize: 16, color: '#374151' },
  checkedDay: { backgroundColor: '#dcfce7', borderRadius: 8 },
  checkedDayText: { color: '#15803d', fontWeight: 'bold' },
  tabBar: { flexDirection: 'row', backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingBottom: 20, paddingTop: 10 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  activeTabText: { color: '#3b82f6', fontWeight: 'bold' },
  centerTab: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabPlaceholderText: { marginTop: 16, fontSize: 18, color: '#64748b' },
  logoutButton: { flexDirection: 'row', marginTop: 32, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: '#fee2e2', borderRadius: 12, alignItems: 'center' },
  logoutText: { color: '#dc2626', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', width: '85%', padding: 24, borderRadius: 16, alignItems: 'center', elevation: 5 },
  closeXButton: { position: 'absolute', top: 16, right: 16, padding: 8 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  modalDesc: { color: '#6b7280', marginBottom: 20, textAlign: 'center' },
  codeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  codeBox: { backgroundColor: '#eff6ff', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, minWidth: 180, alignItems: 'center', marginRight: 10 },
  codeText: { fontSize: 32, fontWeight: 'bold', color: '#2563eb', letterSpacing: 3 },
  refreshBtn: { padding: 12, backgroundColor: '#f3f4f6', borderRadius: 12 },
  securityNote: { fontSize: 12, color: '#9ca3af', marginBottom: 20, minHeight: 20 },
  
  // 👇 복사 알림 메시지 스타일
  copiedMsg: { fontSize: 13, color: '#10b981', fontWeight: 'bold', marginBottom: 20, minHeight: 20 },

  modalCloseBtn: { width: '100%', backgroundColor: '#3b82f6', padding: 14, borderRadius: 12, alignItems: 'center' },
  modalCloseText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  inputGroup: { width: '100%', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 14, width: '100%', backgroundColor: '#f9fafb', fontSize: 16 },
  label: { fontSize: 14, color: '#374151', marginBottom: 6, fontWeight: '600' },
  generateButton: { width: '100%', backgroundColor: '#3b82f6', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8, shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  generateButtonText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  relinkCard: { marginTop: 24, backgroundColor: '#fff', padding: 20, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  relinkTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 8 },
  relinkDesc: { fontSize: 14, color: '#6b7280', marginBottom: 16, lineHeight: 20 },
  relinkButton: { flexDirection: 'row', backgroundColor: '#4b5563', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  relinkButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  missedDay: { backgroundColor: '#fee2e2', borderRadius: 8 },
  missedDayText: { color: '#dc2626', fontWeight: 'bold' },

  
  // 뱃지
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  badgePremium: { backgroundColor: '#fef3c7' },
  badgeFree: { backgroundColor: '#f3f4f6' },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  badgeTextPremium: { color: '#d97706' },
  badgeTextFree: { color: '#4b5563' },

  // 메뉴 리스트
  menuContainer: { backgroundColor: 'white', borderRadius: 16, paddingVertical: 4, marginBottom: 24, elevation: 1 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 20 },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuItemText: { fontSize: 16, color: '#374151', marginLeft: 12 },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 20 },
  
  versionText: { textAlign: 'center', color: '#cbd5e1', fontSize: 12 },

  // 프로필 카드 (수정됨)
  profileCard: { backgroundColor: 'white', padding: 20, borderRadius: 20, marginBottom: 24, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  profileIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' },
  profileName: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  profilePhone: { fontSize: 14, color: '#9ca3af', marginTop: 2 },
  
  // 멤버십 박스 (신규)
  membershipBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb', padding: 16, borderRadius: 12 },
  membershipLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  membershipValue: { fontSize: 16, fontWeight: 'bold' },
  
  // 업그레이드 버튼 (신규)
  upgradeBtn: { flexDirection: 'row', backgroundColor: '#3b82f6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, alignItems: 'center' },
  upgradeBtnText: { color: 'white', fontSize: 12, fontWeight: 'bold', marginRight: 4 },

  // 메뉴 리스트 (기존과 동일하되 여백 조정)
  menuSectionTitle: { fontSize: 13, fontWeight: '700', color: '#9ca3af', marginBottom: 8, marginLeft: 8, marginTop: 8 },
  // ... 나머지는 그대로
});