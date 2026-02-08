/**
 * components/manager/ProfileTab.tsx
 * * Manager 프로필 및 설정 탭 UI
 * - [수정됨] 기본 Alert 대신 예쁜 CustomAlertModal 사용
 * - 배경 클릭 시 닫힘 지원
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking } from 'react-native';
import { 
  User, ChevronRight, FileText, Info, Mail, 
  LogOut, Trash2 
} from 'lucide-react-native';
import { UserInfo } from '../../types';

// 🚨 방금 만든 모달을 불러옵니다. 경로가 다르면 수정해주세요!
import CustomAlertModal from '../modals/CustomAlertModal'; 

interface ProfileTabProps {
  userInfo: UserInfo;
  onLogout: () => void;
  onDeleteAccount: () => Promise<boolean>;
  onUpgrade: () => void;
}

export function ProfileTab({ 
  userInfo, 
  onLogout, 
  onDeleteAccount,
  onUpgrade 
}: ProfileTabProps) {

  // 1. 모달 상태 관리 (켜짐/꺼짐)
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  // 📅 남은 기간 계산 로직 (D-Day)
  const getBillingInfo = () => {
    if (!userInfo?.premium_started_at) return null;

    const startDate = new Date(userInfo.premium_started_at);
    const today = new Date();

    // 다음 결제일 = 시작일 + 1달
    const nextBillingDate = new Date(startDate);
    nextBillingDate.setMonth(startDate.getMonth() + 1);

    // 남은 시간 계산
    const diffTime = nextBillingDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // 날짜 포맷
    const dateStr = nextBillingDate.toISOString().split('T')[0].replace(/-/g, '.');

    return { dateStr, daysLeft };
  };

  const billingInfo = getBillingInfo();

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* 프로필 카드 */}
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

          <View style={styles.divider} />

          {/* 멤버십 상태 섹션 */}
          <View style={styles.membershipBox}>
            
            {/* 1. 왼쪽 텍스트 영역 */}
            <View>
              <Text style={styles.membershipLabel}>현재 이용 중인 플랜</Text>
              <Text style={[
                styles.membershipValue, 
                userInfo?.is_premium ? { color: '#d97706' } : { color: '#4b5563' }
              ]}>
                {userInfo?.is_premium ? '든든한 안심 케어 🛡️' : '무소식 기본 플랜'}
              </Text>
            </View>

            {/* 2. 오른쪽 영역 (버튼 or D-Day 뱃지) */}
            {!userInfo?.is_premium ? (
              // (1) 프리미엄 아니면 -> [혜택 보기] 버튼
              <TouchableOpacity style={styles.upgradeBtn} onPress={onUpgrade}>
                <Text style={styles.upgradeBtnText}>혜택 보기</Text>
                <ChevronRight size={14} color="white" />
              </TouchableOpacity>
            ) : (
              // (2) 프리미엄이면 -> [30일 남음] 뱃지
              billingInfo && (
                <View style={styles.dDayContainer}>
                  <Text style={styles.dDayText}>{billingInfo.daysLeft}일 남음</Text>
                </View>
              )
            )}

          </View>
        </View>

        {/* 고객 지원 섹션 */}
        <Text style={styles.sectionTitle}>고객 지원</Text>
        <View style={styles.menuContainer}>
          <MenuItem 
            icon={<FileText size={20} color="#4b5563" />}
            label="서비스 이용약관"
            onPress={() => Linking.openURL('https://www.notion.so/Musosik-2eabea82a55680c59934db2f27086e62')}
          />
          
          <View style={styles.divider} />

          <MenuItem 
            icon={<Info size={20} color="#4b5563" />}
            label="개인정보처리방침"
            onPress={() => Linking.openURL('https://www.notion.so/Musosik-2eabea82a55680c59934db2f27086e62')}
          />

          <View style={styles.divider} />

          <MenuItem 
            icon={<Mail size={20} color="#4b5563" />}
            label="문의하기 / 버그 신고"
            onPress={() => Linking.openURL('mailto:musosik4u@gmail.com')}
          />
        </View>

        {/* 계정 관리 섹션 */}
        <Text style={styles.sectionTitle}>계정 관리</Text>
        <View style={styles.menuContainer}>
          
          {/* 로그아웃 버튼 -> Alert 대신 state 변경 */}
          <MenuItem 
            icon={<LogOut size={20} color="#4b5563" />}
            label="로그아웃"
            onPress={() => setLogoutModalVisible(true)} 
          />
          
          <View style={styles.divider} />

          {/* 회원탈퇴 버튼 -> Alert 대신 state 변경 */}
          <MenuItem 
            icon={<Trash2 size={20} color="#ef4444" />}
            label="회원 탈퇴"
            labelColor="#ef4444"
            onPress={() => setDeleteModalVisible(true)}
          />
        </View>

        <Text style={styles.versionText}>앱 버전 v2.3.83</Text>
        <View style={{ height: 40 }} />
        
      </ScrollView>

      {/* 👇 2. 화면 하단에 모달 배치 (Alert 대체) */}
      
      {/* (A) 로그아웃 모달 */}
      <CustomAlertModal
        visible={logoutModalVisible}
        title="로그아웃"
        message="정말 로그아웃 하시겠습니까?"
        confirmText="로그아웃"
        onClose={() => setLogoutModalVisible(false)} // 닫기/배경클릭
        onConfirm={onLogout} // 실제 로그아웃 실행
        type="default"
      />

      {/* (B) 회원탈퇴 모달 (빨간맛) */}
      <CustomAlertModal
        visible={deleteModalVisible}
        title="정말 떠나시겠어요? 😢"
        message={`탈퇴 시 모든 안부 기록과 멤버 연결 정보가\n즉시 삭제되며 복구할 수 없습니다.`}
        confirmText="탈퇴하기"
        type="danger" // 빨간 버튼
        onClose={() => setDeleteModalVisible(false)}
        onConfirm={async () => {
          // 탈퇴 로직 실행
          const success = await onDeleteAccount();
          if (success) {
            // 성공 시 로그아웃 처리
            onLogout(); 
          }
        }}
      />
    </>
  );
}

// 재사용 가능한 메뉴 아이템 컴포넌트
function MenuItem({ 
  icon, 
  label, 
  labelColor = '#374151',
  onPress 
}: { 
  icon: React.ReactNode; 
  label: string; 
  labelColor?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        {icon}
        <Text style={[styles.menuItemText, { color: labelColor }]}>{label}</Text>
      </View>
      <ChevronRight size={20} color="#9ca3af" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { 
    padding: 20 
  },

  // 프로필 카드
  profileCard: { 
    backgroundColor: 'white', 
    padding: 20, 
    borderRadius: 20, 
    marginBottom: 24, 
    elevation: 2, 
    shadowColor: '#000', 
    shadowOpacity: 0.05, 
    shadowRadius: 10 
  },
  profileRow: { 
    flexDirection: 'row', 
    alignItems: 'center',
    marginBottom: 16
  },
  profileIconCircle: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    backgroundColor: '#3b82f6', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  profileName: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#1f2937' 
  },
  profilePhone: { 
    fontSize: 14, 
    color: '#9ca3af', 
    marginTop: 2 
  },

  // 멤버십
  membershipBox: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: '#f9fafb', 
    padding: 16, 
    borderRadius: 12 
  },
  membershipLabel: { 
    fontSize: 12, 
    color: '#6b7280', 
    marginBottom: 4 
  },
  membershipValue: { 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  upgradeBtn: { 
    flexDirection: 'row', 
    backgroundColor: '#3b82f6', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 20, 
    alignItems: 'center' 
  },
  upgradeBtnText: { 
    color: 'white', 
    fontSize: 12, 
    fontWeight: 'bold', 
    marginRight: 4 
  },

  // 섹션
  sectionTitle: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: '#9ca3af', 
    marginBottom: 8, 
    marginLeft: 8, 
    marginTop: 8 
  },

  // 메뉴
  menuContainer: { 
    backgroundColor: 'white', 
    borderRadius: 16, 
    paddingVertical: 4, 
    marginBottom: 24, 
    elevation: 1 
  },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 16, 
    paddingHorizontal: 20 
  },
  menuItemLeft: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  menuItemText: { 
    fontSize: 16, 
    marginLeft: 12 
  },

  // 공통
  divider: { 
    height: 1, 
    backgroundColor: '#f3f4f6', 
    marginHorizontal: 20 
  },
  versionText: { 
    textAlign: 'center', 
    color: '#cbd5e1', 
    fontSize: 12 
  },

  dDayContainer: {
    backgroundColor: '#fff7ed', // 아주 연한 오렌지색 배경
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  dDayText: {
    color: '#d97706', // 진한 오렌지색 글씨
    fontSize: 13,
    fontWeight: '700',
  },
});