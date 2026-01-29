/**
 * ProfileTab.tsx
 * 
 * Manager 프로필 및 설정 탭 UI
 * - 프로필 정보 표시
 * - 멤버십 상태
 * - 고객 지원 메뉴
 * - 계정 관리
 * 
 * @extracted from ManagerMain.tsx (421-561줄)
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import { 
  User, ChevronRight, FileText, Info, Mail, 
  LogOut, Trash2, Crown 
} from 'lucide-react-native';
import { UserInfo } from '../../types';

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

  // 회원 탈퇴 확인
  const handleDeleteAccount = () => {
    Alert.alert(
      "정말 떠나시겠어요? 😢",
      "탈퇴 시 모든 안부 기록과 멤버 연결 정보가 즉시 삭제되며 복구할 수 없습니다.",
      [
        { text: "취소", style: "cancel" },
        { 
          text: "탈퇴하기", 
          style: "destructive",
          onPress: async () => {
            const success = await onDeleteAccount();
            if (success) {
              Alert.alert("탈퇴 완료", "그동안 이용해주셔서 감사합니다.");
              onLogout();
            }
          }
        }
      ]
    );
  };

  return (
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

        {/* 멤버십 상태 */}
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

          {/* 프리미엄이 아닐 때만 업그레이드 버튼 */}
          {!userInfo?.is_premium && (
            <TouchableOpacity style={styles.upgradeBtn} onPress={onUpgrade}>
              <Text style={styles.upgradeBtnText}>혜택 보기</Text>
              <ChevronRight size={14} color="white" />
            </TouchableOpacity>
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
          onPress={() => Linking.openURL('mailto:support@musosik.app')}
        />
      </View>

      {/* 계정 관리 섹션 */}
      <Text style={styles.sectionTitle}>계정 관리</Text>
      <View style={styles.menuContainer}>
        <MenuItem 
          icon={<LogOut size={20} color="#4b5563" />}
          label="로그아웃"
          onPress={onLogout}
        />
        
        <View style={styles.divider} />

        <MenuItem 
          icon={<Trash2 size={20} color="#ef4444" />}
          label="회원 탈퇴"
          labelColor="#ef4444"
          onPress={handleDeleteAccount}
        />
      </View>

      <Text style={styles.versionText}>앱 버전 v1.0.0</Text>
      <View style={{ height: 40 }} />
      
    </ScrollView>
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
});
