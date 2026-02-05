import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, 
  ScrollView, RefreshControl, Alert, Dimensions, Image, Modal } from 'react-native';
import { X, CheckCircle, XCircle } from 'lucide-react-native'; // 아이콘 추가
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ChevronRight, Plus, Settings, 
  User, Crown, RefreshCw, Camera } from 'lucide-react-native';
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
  const [activeTab, setActiveTab] = useState<'list' | 'notifications' | 'profile'>('list');
  const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserInfo>(userInfo);
  const [relinkModalVisible, setRelinkModalVisible] = useState(false);
  const [currentRelinkCode, setCurrentRelinkCode] = useState<string | null>(null);

  // 선택된 멤버의 캘린더 데이터
  const { currentDate, checkInLogs, changeMonth, getDaysInMonth } = useCalendar(
    selectedMember?.id, 
    userInfo.is_premium ?? false
  );
  
  
  // 초기 로드
  useEffect(() => {
    if (userInfo) fetchMembers();
  }, [userInfo]);

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
                      {member.is_safe_today ? '오늘 안부를 전했습니다 ✅' : '아직 소식이 없습니다 ⏳'}
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

        {/* 탭 1-상세: 멤버 캘린더 */}
        {activeTab === 'list' && selectedMember && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <TouchableOpacity onPress={() => setSelectedMember(null)} style={styles.backButton}>
              <ChevronLeft size={20} color="#2563eb" />
              <Text style={styles.backButtonText}>목록으로</Text>
            </TouchableOpacity>

            {/* 캘린더 카드 */}
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

              {/* 요일 헤더 */}
              <View style={styles.weekRow}>
                {['일', '월', '화', '수', '목', '금', '토'].map(d => (
                  <Text key={d} style={styles.weekDayText}>{d}</Text>
                ))}
              </View>

              {/* 날짜 그리드 */}
              <View style={styles.daysGrid}>
                {Array.from({ length: getDaysInMonth(currentDate).startingDayOfWeek }).map((_, i) => (
                  <View key={`empty-${i}`} style={styles.dayCell} />
                ))}
                {/* 날짜 렌더링 */}
                {Array.from({ length: getDaysInMonth(currentDate).daysInMonth }).map((_, i) => {
                   const day = i + 1;
                   const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                   
                   const now = new Date();
                   const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                   
                   // 🔥 Map에서 확인 (has -> get)
                   const logData = checkInLogs.get(dateKey);
                   const isChecked = !!logData;
                   const isFuture = dateKey > todayKey;
                   const isMissed = !isChecked && !isFuture;

                   return (
                     <TouchableOpacity 
                       key={day} 
                       style={[
                         styles.dayCell, 
                         isChecked && styles.checkedDay,
                         isMissed && styles.missedDay
                       ]}
                       // 🔥 클릭 이벤트 연결
                       onPress={() => handleDayPress(day, dateKey)}
                       disabled={isFuture} // 미래 날짜는 클릭 불가
                     >
                       <Text style={[
                         styles.dayText, 
                         isChecked && styles.checkedDayText,
                         isMissed && styles.missedDayText
                       ]}>
                         {day}
                       </Text>
                     </TouchableOpacity>
                   );
                 })}
              </View>
            </View>

            {/* 재연결 카드 */}
            <View style={styles.relinkCard}>
              <Text style={styles.relinkTitle}>기기 변경 / 재설치</Text>
              <Text style={styles.relinkDesc}>
                멤버가 앱을 삭제했거나 기기를 바꿨나요?{'\n'}
                아래 버튼을 눌러 연결 코드를 다시 발급해주세요.
              </Text>
              <TouchableOpacity style={styles.relinkButton} onPress={handleGenerateRelinkCode}>
                <RefreshCw size={20} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.relinkButtonText}>재연결 코드 발급</Text>
              </TouchableOpacity>
            </View>

            {/* 🔥 [NEW] 멤버 삭제 카드 */}
            <View style={styles.deleteCard}>
              <Text style={styles.deleteTitle}>멤버 삭제</Text>
              <Text style={styles.deleteDesc}>
                더 이상 이 멤버를 관리하지 않거나, 잘못 등록된 경우 멤버를 삭제할 수 있습니다.
              </Text>
              <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteMember}>
                <Text style={styles.deleteButtonText}>멤버 삭제하기</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
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
});
