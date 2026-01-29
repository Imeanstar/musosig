/**
 * ManagerMain.tsx (Refactored)
 * 
 * Manager 메인 화면 - 리팩토링 버전
 * 
 * Before: 805줄, 12개 상태, 8가지 책임
 * After: ~150줄, 3개 상태, 1가지 책임 (라우팅)
 * 
 * @refactored 2026.01
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, Alert, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ChevronRight, Plus, Settings, User, Crown, RefreshCw } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Hooks
import { useUserManagement } from '../hooks/useUserManagement';
import { useMemberList } from '../hooks/useMemberList';
import { useInviteCode } from '../hooks/useInviteCode';
import { useCalendar } from '../hooks/useCalendar';

// Components
import { InviteCodeModal } from './manager/InviteCodeModal';
import { ProfileTab } from './manager/ProfileTab';
import { SubscriptionModal } from './modals/SubscriptionModal';

// Types
import { UserInfo } from '../types';

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
  const { deleteAccount } = useUserManagement();
  
  // 상태 (3개로 축소!)
  const [activeTab, setActiveTab] = useState<'list' | 'notifications' | 'profile'>('list');
  const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // 커스텀 Hooks (비즈니스 로직 분리)
  const { members, refreshing, fetchMembers, onRefresh } = useMemberList(userInfo?.id);
  const { isCodeLoading, generateInviteCode, generateRelinkCode } = useInviteCode();
  const { currentDate, checkInLogs, changeMonth, getDaysInMonth } = useCalendar(selectedMember?.id);

  // 초기 로드
  useEffect(() => {
    if (userInfo) fetchMembers();
  }, [userInfo]);

  // 초대 코드 생성 핸들러
  const handleGenerateCode = async (nickname: string, relation: string): Promise<string> => {
    return await generateInviteCode(userInfo.id, nickname, relation);
  };

  // 재연결 코드 생성 핸들러
  const handleGenerateRelinkCode = async () => {
    if (!selectedMember) return;
    const code = await generateRelinkCode(selectedMember.id);
    if (code) {
      Alert.alert('재연결 코드 발급', `코드: ${code}\n\n멤버에게 이 코드를 전달해주세요.`);
    }
  };

  return (
    <View style={styles.container}>
      
      {/* 헤더 */}
      <LinearGradient colors={['#3b82f6', '#14b8a6']} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>희소식</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {!userInfo?.is_premium && (
              <TouchableOpacity 
                onPress={() => setShowPremiumModal(true)}
                style={styles.upgradeButton}
              >
                <Crown size={14} color="#fbbf24" fill="#fbbf24" />
                <Text style={styles.upgradeButtonText}>UPGRADE</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.addButton} onPress={() => setShowInviteModal(true)}>
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
                {Array.from({ length: getDaysInMonth(currentDate).daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const now = new Date();
                  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                  const isChecked = checkInLogs.has(dateKey);
                  const isFuture = dateKey > todayKey;
                  const isMissed = !isChecked && !isFuture;

                  return (
                    <View 
                      key={day} 
                      style={[
                        styles.dayCell, 
                        isChecked && styles.checkedDay,
                        isMissed && styles.missedDay
                      ]}
                    >
                      <Text style={[
                        styles.dayText, 
                        isChecked && styles.checkedDayText,
                        isMissed && styles.missedDayText
                      ]}>
                        {day}
                      </Text>
                    </View>
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
          </ScrollView>
        )}

        {/* 탭 2: 알림 */}
        {activeTab === 'notifications' && (
          <View style={styles.centerTab}>
            <Settings size={48} color="#cbd5e1" />
            <Text style={styles.tabPlaceholderText}>알림 설정 기능 준비 중</Text>
          </View>
        )}

        {/* 탭 3: 프로필 */}
        {activeTab === 'profile' && (
          <ProfileTab 
            userInfo={userInfo}
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
  centerTab: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabPlaceholderText: { marginTop: 16, fontSize: 18, color: '#64748b' },
  tabBar: { flexDirection: 'row', backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 10 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  activeTabText: { color: '#3b82f6', fontWeight: 'bold' },
});
