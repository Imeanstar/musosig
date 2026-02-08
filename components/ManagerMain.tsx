import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, 
  ScrollView, RefreshControl, Alert, Dimensions, Image, Modal } from 'react-native';
import { X, CheckCircle, XCircle } from 'lucide-react-native'; // 아이콘 추가
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ChevronRight, Plus, Settings, 
  User, Crown, RefreshCw, Camera, Trash2, Link } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '@/lib/supabase';
import * as Clipboard from 'expo-clipboard';
import { RelinkCodeModal } from './manager/RelinkCodeModal';

// Hooks
import { useUserManagement } from '../hooks/useUserManagement';
import { useMemberList } from '../hooks/useMemberList';
import { useInviteCode } from '../hooks/useInviteCode';
import { useCalendar } from '../hooks/useCalendar';
import { useMemberLimit } from '../hooks/useMemberLimit';
import { useDetailModal } from '../hooks/useDetailModal';

// Components
import { InviteCodeModal } from './manager/InviteCodeModal';
import { ProfileTab } from './manager/ProfileTab';
import { SettingsTab } from './manager/SettingsTab';
import { SubscriptionModal } from './modals/SubscriptionModal';
import { DateDetailModal } from './manager/DateDetailModal';
import { CalendarTab } from './manager/CalendarTab';


// Types
import { UserInfo, Member, UserSettings } from '../types';

interface ManagerMainProps {
  onBack: () => void;
  userInfo: UserInfo;
}

interface MemberData extends UserInfo {
  is_safe_today?: boolean;
}

const { width } = Dimensions.get('window');

export function ManagerMain({ onBack, userInfo }: ManagerMainProps) {
  const insets = useSafeAreaInsets();
  
  // Hooks
  const { deleteAccount } = useUserManagement();
  const { checkCanAddMember } = useMemberLimit();
  const { members, refreshing, fetchMembers, onRefresh } = useMemberList(userInfo?.id);
  const { isCodeLoading, generateInviteCode, generateRelinkCode } = useInviteCode();
  const { 
    isVisible: detailModalVisible,
    selectedDate: selectedDateLog,
    showPhoto,
    openDetail,
    closeDetail,
    togglePhoto
  } = useDetailModal();
  
  // 상태
  const [activeTab, setActiveTab] = useState<'list' | 'notifications' | 'profile' | 'calendar'>('list');
  const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserInfo>(userInfo);
  const [relinkModalVisible, setRelinkModalVisible] = useState(false);
  const [currentRelinkCode, setCurrentRelinkCode] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 선택된 멤버의 캘린더 데이터
  const { currentDate, checkInLogs, changeMonth, getDaysInMonth } = useCalendar(
    selectedMember?.id, 
    userInfo.is_premium ?? false
  );

  
  
  // 초기 로드
  useEffect(() => {
    if (userInfo) fetchMembers();
  }, [userInfo]);

  const getKSTDateString = (isoString: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
    return kstDate.toISOString().split('T')[0];
  };

  // 멤버 추가 버튼 클릭
  const handleOpenInviteModal = () => {
    const canAdd = checkCanAddMember(
      members.length,
      currentUser?.is_premium ?? false,
      () => setShowPremiumModal(true)
    );
    
    if (canAdd) {
      setShowInviteModal(true);
    }
  };

  // 초대 코드 생성 핸들러
  const handleGenerateCode = async (nickname: string, relation: string): Promise<string> => {
    return await generateInviteCode(userInfo.id, nickname, relation);
  };

  // 재연결 코드 생성 핸들러
  const handleGenerateRelinkCode = async () => {
    if (!selectedMember) return;
    
    // 1. 코드 생성 요청
    const code = await generateRelinkCode(selectedMember.id);
    
    if (code) {
      setCurrentRelinkCode(code);
      setRelinkModalVisible(true);
    }
  };

  const handleMemberOptions = () => {
    if (!selectedMember) return;
    setIsSettingsOpen(true); // Alert 대신 모달을 엽니다.
  };

  // 🗑️ 멤버 삭제 핸들러
  const handleDeleteMember = () => {
    if (!selectedMember) return;

    Alert.alert(
      "정말 삭제하시겠습니까? 🚨",
      `'${selectedMember.name}'님을 멤버에서 삭제합니다.\n\n모든 출석 기록과 연결된 데이터가 영구적으로 삭제되며, 복구할 수 없습니다.`,
      [
        { text: "취소", style: "cancel" },
        { 
          text: "삭제하기", 
          style: "destructive", // 빨간색 버튼 (iOS)
          onPress: async () => {
            try {
              // 1. 출석 기록(Logs) 먼저 싹 지우기
              const { error: logError } = await supabase
                .from('check_in_logs')
                .delete()
                .eq('member_id', selectedMember.id);
              
              if (logError) throw logError;

              // 2. 유저(Member) 정보 삭제하기
              const { error: userError } = await supabase
                .from('users')
                .delete()
                .eq('id', selectedMember.id);

              if (userError) throw userError;

              // 3. 성공 처리
              Alert.alert("삭제 완료", "멤버 삭제가 완료되었습니다.");
              setSelectedMember(null); // 상세 화면 닫기
              fetchMembers(); // 목록 새로고침

            } catch (e) {
              console.error("삭제 실패:", e);
              Alert.alert("오류", "멤버를 삭제하지 못했습니다.\n잠시 후 다시 시도해주세요.");
            }
          }
        }
      ]
    );
  };

  // 날짜 클릭 핸들러
  const handleDayPress = (day: number, dateKey: string) => {
    const log = checkInLogs.get(dateKey) || null;
    openDetail(day, dateKey, log);
  };

  const refreshUserData = async () => {
    try {
      // DB에서 내 최신 정보를 다시 조회
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (data && !error) {
        // 기존 정보에 덮어씌우기 (is_premium 등 최신화)
        // user_id 등 누락된 필드가 있을 수 있으니 안전하게 병합
        setCurrentUser(prev => ({
            ...prev,
            ...data,
            is_premium: data.is_premium ?? false, // 확실하게 boolean 처리
        }));
        console.log('🔄 유저 정보 최신화 완료:', data.is_premium ? '프리미엄' : '무료');
      }
    } catch (e) {
      console.error('유저 정보 갱신 실패:', e);
    }
  };

  // ✨ [추가] 탭이 바뀔 때마다 실행되는 감시자 (useEffect)
  useEffect(() => {
    refreshUserData();
  }, [activeTab]); // 👈 activeTab이 바뀔 때마다 이 안의 코드가 실행됨!

  const handleUpdateMemberSetting = async (memberId: string, newSettings: UserSettings) => {
    try {
      console.log(`💾 저장 시도 - 멤버: ${memberId}, 설정:`, newSettings);

      // 1. Supabase에 업데이트
      const { error } = await supabase
        .from('users')
        .update({ 
          settings: newSettings,
          updated_at: new Date(), // 수정 시간도 갱신
        })
        .eq('id', memberId);

      if (error) throw error;

      // 2. 성공 시 목록 새로고침 (화면 즉시 반영)
      await fetchMembers();
      
      // (선택) 사용자에게 알림을 띄우고 싶지 않다면 이 줄은 빼셔도 됩니다.
      // SettingsTab 내부에서 이미 '저장 완료' 알림을 띄우고 있으니 여긴 조용히 넘어가도 됩니다.

    } catch (e) {
      console.error('설정 저장 실패:', e);
      Alert.alert('오류', '설정을 저장하지 못했습니다. 다시 시도해 주세요.');
    }
  };
  
  return (
    <View style={styles.container}>
      
      {/* 헤더 */}
      <LinearGradient colors={['#3b82f6', '#14b8a6']} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>희소식</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity style={styles.addButton} onPress={handleOpenInviteModal}>
              <Plus color="white" size={20} />
              <Text style={styles.addButtonText}>멤버 추가</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* 메인 컨텐츠 */}
      <View style={styles.content}>
        
        {/* 탭 1: 멤버 목록 */}
        {activeTab === 'list' && !selectedMember && (
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            <Text style={styles.sectionTitle}>내 멤버 목록</Text>
            {members.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyText}>아직 등록된 멤버가 없습니다.</Text>
                <Text style={styles.emptySubText}>우측 상단 '멤버 추가'를 눌러{'\n'}초대 코드를 확인하세요!</Text>
              </View>
            ) : (
              members.map((member) => {
                // 🚨 [수정됨] KST(한국시간) 기준으로 정확하게 계산하는 로직
                const isSafe = (() => {
                  // 1. DB가 false면 무조건 미출석
                  if (!member.is_safe_today) return false;
                  // 2. 기록 자체가 없으면 미출석
                  if (!member.last_seen_at) return false;
                  
                  // 3. 한국 시간으로 변환해서 날짜만 비교 (YYYY-MM-DD)
                  // (getKSTDateString 함수는 ManagerMain 컴포넌트 상단에 만들어두셨죠?)
                  const lastDate = getKSTDateString(member.last_seen_at); 
                  const today = getKSTDateString(new Date().toISOString()); 
                  
                  return lastDate === today;
                })();
              
                // 👇 화면 그리는 부분 (UI는 그대로입니다)
                return (
                  <TouchableOpacity
                    key={member.id}
                    style={styles.memberCard}
                    onPress={() => {
                      setSelectedMember(member);
                      setActiveTab('calendar');  
                    }}
                    activeOpacity={0.9}
                  >
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{member.nickname || member.name} 님</Text>
                      <Text style={styles.memberStatus}>
                        {isSafe ? '오늘 안부를 전했습니다 ✅' : '아직 소식이 없습니다 ⏳'}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusIcon, 
                      { backgroundColor: isSafe ? '#dcfce7' : '#fee2e2' }
                    ]}>
                      <Text style={{ fontSize: 24 }}>
                        {isSafe ? '😊' : '🥺'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        )}

        {/* 탭 1-상세: 멤버 캘린더 */}
        {activeTab === 'calendar' && selectedMember && (
          <View style={{ flex: 1, backgroundColor: 'white' }}>
            
            {/* 🎩 [추가됨] 관리자 헤더바 */}
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              justifyContent: 'space-between', // 양쪽 끝으로 배치
              paddingHorizontal: 16, 
              paddingVertical: 12, 
              borderBottomWidth: 1,
              borderBottomColor: '#f3f4f6',
              backgroundColor: 'white'
            }}>
              
              {/* 1. 뒤로가기 버튼 */}
              <TouchableOpacity 
                onPress={() => {
                  setSelectedMember(null);
                  setActiveTab('list');
                }}
                style={{ padding: 8 }}
              >
                <ChevronLeft size={24} color="#1f2937" />
              </TouchableOpacity>

              {/* 2. 멤버 이름 (가운데) */}
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1f2937' }}>
                {selectedMember.name} 님의 기록
              </Text>

              {/* 3. ⚙️ 설정 버튼 (오른쪽) */}
              <TouchableOpacity 
                onPress={handleMemberOptions}
                style={{ padding: 8 }}
              >
                <Settings size={24} color="#4b5563" />
              </TouchableOpacity>
            </View>

            {/* 📅 달력 컴포넌트 */}
            <CalendarTab member={selectedMember as Member} />
            
          </View>
        )}

        {/* 탭 2: 알림 */}
        {activeTab === 'notifications' && (
          <SettingsTab 
            isPremium={currentUser?.is_premium ?? false} // 유저의 프리미엄 상태 전달
            onUpgradePress={() => setShowPremiumModal(true)} // 업그레이드 모달 띄우는 함수 전달
          
            members={members as Member[]}
            onUpdateMemberSetting={handleUpdateMemberSetting}

            managerSettings={userInfo.settings || {}} // 내 설정 전달
              onUpdateManagerSettings={async (newSettings) => {
                 // 즉시 DB에 저장
                 await supabase
                   .from('users')
                   .update({ settings: newSettings })
                   .eq('id', userInfo.id);

              }}
          />
        )}

        {/* 탭 3: 프로필 */}
        {activeTab === 'profile' && (
          <ProfileTab 
            userInfo={currentUser}
            onLogout={onBack}
            onDeleteAccount={deleteAccount}
            onUpgrade={() => setShowPremiumModal(true)}
          />
        )}
      </View>

      {/* 하단 탭바 */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 20 }]}>
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

      {/* 모달들 */}
      <DateDetailModal 
        visible={detailModalVisible}
        onClose={closeDetail}
        date={selectedDateLog?.date || ''}
        log={selectedDateLog?.log || null}
        showPhoto={showPhoto}
        onTogglePhoto={togglePhoto}
      />

      <InviteCodeModal 
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onGenerate={handleGenerateCode}
        isLoading={isCodeLoading}
      />

      <SubscriptionModal 
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
      />

      <RelinkCodeModal
         visible={relinkModalVisible}
         code={currentRelinkCode}
         memberName={selectedMember?.nickname || selectedMember?.name || '멤버'}
         onClose={() => setRelinkModalVisible(false)}
       />   

      <Modal
        visible={isSettingsOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsSettingsOpen(false)}
      >
        {/* 1. 배경 (누르면 닫힘) */}
        <TouchableOpacity 
          style={styles.bottomSheetOverlay} 
          activeOpacity={1} 
          onPress={() => setIsSettingsOpen(false)}
        >
          {/* 2. 하단 시트 내용 */}
          <View style={styles.bottomSheetContainer} onStartShouldSetResponder={() => true}>
            
            {/* 핸들바 (디자인 요소) */}
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {selectedMember?.name}님 관리
              </Text>
              <TouchableOpacity onPress={() => setIsSettingsOpen(false)}>
                <X size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {/* 메뉴 1: 재연결 코드 */}
            <TouchableOpacity 
              style={styles.sheetMenuBtn}
              onPress={() => {
                setIsSettingsOpen(false); // 모달 닫고
                setTimeout(() => handleGenerateRelinkCode(), 300); // 실행 (애니메이션 겹침 방지)
              }}
            >
              <View style={[styles.menuIconBox, { backgroundColor: '#eff6ff' }]}>
                <Link size={24} color="#3b82f6" />
              </View>
              <View style={styles.menuTextBox}>
                <Text style={styles.menuTitle}>재연결 코드 발급</Text>
                <Text style={styles.menuSub}>연결이 끊겼을 때 다시 연결합니다.</Text>
              </View>
              <ChevronRight size={20} color="#cbd5e1" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            {/* 메뉴 2: 멤버 삭제 (빨간색) */}
            <TouchableOpacity 
              style={styles.sheetMenuBtn}
              onPress={() => {
                setIsSettingsOpen(false);
                setTimeout(() => handleDeleteMember(), 300);
              }}
            >
              <View style={[styles.menuIconBox, { backgroundColor: '#fee2e2' }]}>
                <Trash2 size={24} color="#ef4444" />
              </View>
              <View style={styles.menuTextBox}>
                <Text style={[styles.menuTitle, { color: '#ef4444' }]}>멤버 삭제</Text>
                <Text style={styles.menuSub}>모든 기록을 영구적으로 삭제합니다.</Text>
              </View>
              <ChevronRight size={20} color="#cbd5e1" />
            </TouchableOpacity>

            <View style={{ height: 30 }} /> 
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  upgradeButton: { marginRight: 8, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  upgradeButtonText: { color: 'white', fontWeight: 'bold', marginLeft: 4, fontSize: 11 },
  addButton: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 8, alignItems: 'center' },
  addButtonText: { color: 'white', marginLeft: 4, fontWeight: '600' },
  content: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyIcon: { fontSize: 60, marginBottom: 20 },
  emptyText: { fontSize: 18, color: '#374151', fontWeight: 'bold' },
  emptySubText: { fontSize: 14, color: '#9ca3af', marginTop: 8, textAlign: 'center', lineHeight: 20 },
  memberCard: { backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 2 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  memberStatus: { fontSize: 14, color: '#6b7280' },
  statusIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
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
  missedDay: { backgroundColor: '#fee2e2', borderRadius: 8 },
  missedDayText: { color: '#dc2626', fontWeight: 'bold' },
  relinkCard: { marginTop: 24, backgroundColor: '#fff', padding: 20, borderRadius: 16, elevation: 3 },
  relinkTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 8 },
  relinkDesc: { fontSize: 14, color: '#6b7280', marginBottom: 16, lineHeight: 20 },
  relinkButton: { flexDirection: 'row', backgroundColor: '#4b5563', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  relinkButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  deleteCard: { marginTop: 20, backgroundColor: '#fff', padding: 20, borderRadius: 16, elevation: 3, borderWidth: 1, borderColor: '#fee2e2' },
  deleteTitle: { fontSize: 18, fontWeight: 'bold', color: '#ef4444', marginBottom: 8 },
  deleteDesc: { fontSize: 14, color: '#6b7280', marginBottom: 16, lineHeight: 20 },
  deleteButton: { backgroundColor: '#fee2e2', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#fca5a5' },
  deleteButtonText: { color: '#dc2626', fontWeight: 'bold', fontSize: 16 },
  centerTab: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabPlaceholderText: { marginTop: 16, fontSize: 18, color: '#64748b' },
  tabBar: { flexDirection: 'row', backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 10 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  activeTabText: { color: '#3b82f6', fontWeight: 'bold' },
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)', // 반투명 검은 배경
    justifyContent: 'flex-end', // 바닥에 붙이기
  },
  bottomSheetContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40, // 아이폰 홈바 공간 확보
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  sheetMenuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuTextBox: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  menuSub: {
    fontSize: 13,
    color: '#6b7280',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 12,
    marginLeft: 64, // 아이콘 너비만큼 띄우기
  },
});
