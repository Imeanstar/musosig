/**
 * SettingsTab.tsx (v2.1 - Fix DnD Error)
 * - 매니저 앱 자체 설정 (방해금지 포함) 상태 관리 추가
 * - 멤버별 설정 리스트 및 모달
 */

import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, 
  Alert, Modal, FlatList
} from 'react-native';
import { ChevronRight, ChevronLeft, Check, User as UserIcon, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Member, UserSettings } from '../../types'; // 타입 불러오기

interface SettingsTabProps {
  isPremium: boolean;
  onUpgradePress: () => void;
  members: Member[];
  onUpdateMemberSetting: (memberId: string, settings: any) => void;
  // 🔥 [NEW] 매니저 본인의 설정을 저장하는 함수 (부모에서 받아옴)
  onUpdateManagerSettings?: (settings: UserSettings) => void;
  managerSettings?: UserSettings; // 매니저 본인의 현재 설정
}

const CHECK_IN_OPTIONS = [
  { label: '기본 클릭 (터치)', value: '클릭' },
  { label: '산수 문제 (쉬움)', value: '수학(EASY)' },
  { label: '산수 문제 (어려움)', value: '수학(HARD)' },
  { label: '사진 인증', value: '사진인증' },
  { label: '휴대폰 흔들기', value: '흔들기' },
];

const ALERT_CYCLES = [48, 72, 96]; 

export function SettingsTab({ 
  isPremium, 
  onUpgradePress, 
  members, 
  onUpdateMemberSetting,
  onUpdateManagerSettings,
  managerSettings = {} // 기본값
}: SettingsTabProps) {

  // --- [1] 매니저 앱 설정 상태 (방해금지 등) ---
  // 🔥 tempSettings 선언 (에러 해결!)
  const [tempSettings, setTempSettings] = useState<UserSettings>(managerSettings);
  const [showTimePicker, setShowTimePicker] = useState<'start' | 'end' | null>(null);

  // 부모로부터 받은 설정이 바뀌면 동기화
  useEffect(() => {
    setTempSettings(managerSettings);
  }, [managerSettings]);

  // 매니저 설정 변경 시 즉시 저장 요청 (Debounce 적용하면 더 좋지만 일단 즉시 반영)
  useEffect(() => {
    if (onUpdateManagerSettings) {
       onUpdateManagerSettings(tempSettings);
    }
  }, [tempSettings]);


  // --- [2] 멤버별 설정을 위한 상태 ---
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempMethod, setTempMethod] = useState('클릭');
  const [tempCycleIndex, setTempCycleIndex] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);


  // 멤버 설정 열기
  const openMemberSettings = (member: Member) => {
    if (!isPremium) return;
    
    setSelectedMember(member);
    setTempMethod(member.settings?.checkInMethod || '클릭');
    const currentCycle = member.settings?.alertCycle || 48;
    const idx = ALERT_CYCLES.indexOf(currentCycle);
    setTempCycleIndex(idx >= 0 ? idx : 0);
    setIsModalOpen(true);
  };

  // 멤버 설정 저장
  const saveMemberSettings = () => {
    if (selectedMember) {
      const newSettings = {
        ...selectedMember.settings,
        checkInMethod: tempMethod,
        alertCycle: ALERT_CYCLES[tempCycleIndex],
      };
      onUpdateMemberSetting(selectedMember.id, newSettings);
      setIsModalOpen(false);
      Alert.alert("저장 완료", `${selectedMember.name}님의 설정이 변경되었습니다.`);
    }
  };

  const handleCycleChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev') setTempCycleIndex(prev => Math.max(0, prev - 1));
    else setTempCycleIndex(prev => Math.min(ALERT_CYCLES.length - 1, prev + 1));
  };


  return (
    <ScrollView contentContainerStyle={styles.container}>
      
      {/* ================= 섹션 1: 매니저 앱 설정 ================= */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>내 앱 설정</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>알림 수신 설정</Text>
        <View style={styles.halfContainer}>
          <View style={styles.halfItem}>
            <Text style={styles.label}>앱 알림</Text>
            <Switch
              trackColor={{ false: "#e5e7eb", true: "#3b82f6" }}
              thumbColor={"white"}
              value={tempSettings.pushEnabled ?? true}
              onValueChange={(val) => setTempSettings(prev => ({ ...prev, pushEnabled: val }))}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }} 
            />
          </View>
          <View style={styles.halfItem}>
            <Text style={styles.label}>문자 알림</Text>
            <Switch
              trackColor={{ false: "#e5e7eb", true: "#1f2937" }}
              thumbColor={"white"}
              value={tempSettings.smsEnabled ?? true}
              onValueChange={(val) => setTempSettings(prev => ({ ...prev, smsEnabled: val }))}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
          </View>
        </View>
      </View>

      {/* 방해금지 섹션 (카드 분리) */}
      <View style={styles.card}>
        <View style={styles.settingItem}>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>방해금지 시간</Text>
              <Text style={styles.settingDesc}>
                설정한 시간에는 알림을 받지 않습니다.{'\n'}(주무시는 시간에 설정해보세요)
              </Text>
            </View>
            <Switch
              trackColor={{ false: '#767577', true: '#3b82f6' }}
              thumbColor={'#f4f3f4'}
              value={tempSettings.dndEnabled ?? false}
              onValueChange={(val) => setTempSettings(prev => ({ ...prev, dndEnabled: val }))}
            />
        </View>

        {/* 방해금지 시간이 켜져있을 때만 시간 선택기 표시 */}
        {tempSettings.dndEnabled && (
          <View style={styles.dndTimeContainer}>
            <TouchableOpacity 
              style={styles.timeButton} 
              onPress={() => setShowTimePicker('start')}
            >
              <Text style={styles.timeLabel}>시작</Text>
              <Text style={styles.timeValue}>
                {tempSettings.dndStartTime || '23:00'}
              </Text>
            </TouchableOpacity>
            
            <Text style={{ color: '#9ca3af' }}>~</Text>

            <TouchableOpacity 
              style={styles.timeButton} 
              onPress={() => setShowTimePicker('end')}
            >
              <Text style={styles.timeLabel}>종료</Text>
              <Text style={styles.timeValue}>
                {tempSettings.dndEndTime || '07:00'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* DateTimePicker */}
      {showTimePicker && (
        <DateTimePicker
          value={(() => {
            const now = new Date();
            const [hours, minutes] = (
              showTimePicker === 'start' 
                ? (tempSettings.dndStartTime || '23:00') 
                : (tempSettings.dndEndTime || '07:00')
            ).split(':').map(Number);
            now.setHours(hours, minutes);
            return now;
          })()}
          mode="time"
          is24Hour={true}
          display="spinner"
          onChange={(event, selectedDate) => {
            const type = showTimePicker;
            setShowTimePicker(null);
            
            if (event.type === 'set' && selectedDate) {
              const hours = String(selectedDate.getHours()).padStart(2, '0');
              const minutes = String(selectedDate.getMinutes()).padStart(2, '0');
              const timeString = `${hours}:${minutes}`;
              
              setTempSettings(prev => ({
                ...prev,
                [type === 'start' ? 'dndStartTime' : 'dndEndTime']: timeString
              }));
            }
          }}
        />
      )}


      {/* ================= 섹션 2: 멤버별 케어 설정 ================= */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>멤버별 맞춤 케어</Text>
        <Text style={styles.sectionSubtitle}>멤버를 눌러 개별 설정을 변경하세요.</Text>
      </View>

      <View style={styles.premiumSectionContainer}>
        {/* 멤버 리스트 카드 */}
        <View style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
          {members.length === 0 ? (
             <View style={{ padding: 24, alignItems: 'center' }}>
               <Text style={{ color: '#9ca3af' }}>등록된 멤버가 없습니다.</Text>
             </View>
          ) : (
            members.map((member, index) => (
              <TouchableOpacity 
                key={member.id} 
                style={[
                  styles.memberRow, 
                  index !== members.length - 1 && styles.memberRowBorder,
                  !isPremium && { opacity: 0.3 }
                ]}
                onPress={() => openMemberSettings(member)}
                disabled={!isPremium}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.avatarCircle}>
                    <UserIcon size={20} color="#6b7280" />
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <View style={{ flexDirection: 'row', marginTop: 4 }}>
                      <View style={styles.miniBadge}>
                        <Text style={styles.miniBadgeText}>
                          {member.settings?.checkInMethod || '클릭'}
                        </Text>
                      </View>
                      <View style={[styles.miniBadge, { marginLeft: 4, backgroundColor: '#eff6ff' }]}>
                        <Text style={[styles.miniBadgeText, { color: '#3b82f6' }]}>
                          {member.settings?.alertCycle || 48}시간
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                <ChevronRight size={20} color="#d1d5db" />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* 프리미엄 잠금 오버레이 */}
        {!isPremium && (
          <View style={styles.premiumOverlay}>
            <Text style={styles.overlayTitle}>
              멤버별 맞춤 케어는{'\n'}프리미엄 기능입니다
            </Text>
            <TouchableOpacity onPress={onUpgradePress}>
              <LinearGradient
                colors={['#3b82f6', '#06b6d4']}
                style={styles.premiumBtn}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <Text style={styles.premiumBtnText}>프리미엄 구독하기</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={{ height: 40 }} />


      {/* ================= [모달] 멤버 개별 설정창 ================= */}
      <Modal
        visible={isModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.settingsModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedMember?.name}님 케어 설정</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {/* 인증 방식 */}
              <Text style={styles.settingLabel}>출석 인증 방식</Text>
              <TouchableOpacity 
                style={styles.selectorBtn} 
                onPress={() => setIsDropdownOpen(true)}
              >
                <Text style={styles.selectorText}>
                  {CHECK_IN_OPTIONS.find(opt => opt.value === tempMethod)?.label || tempMethod}
                </Text>
                <ChevronRight size={24} color="#9ca3af" style={{ transform: [{ rotate: '90deg' }] }} />
              </TouchableOpacity>
              
              {isDropdownOpen && (
                <View style={styles.dropdownList}>
                  {CHECK_IN_OPTIONS.map((opt) => (
                    <TouchableOpacity 
                      key={opt.value} 
                      style={styles.dropdownItem}
                      onPress={() => {
                        setTempMethod(opt.value);
                        setIsDropdownOpen(false);
                      }}
                    >
                      <Text style={[
                        styles.dropdownItemText, 
                        tempMethod === opt.value && { color: '#3b82f6', fontWeight: 'bold' }
                      ]}>
                        {opt.label}
                      </Text>
                      {tempMethod === opt.value && <Check size={16} color="#3b82f6"/>}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={{ height: 24 }} />

              {/* 알림 주기 */}
              <View>
                <Text style={styles.settingLabel}>비상 알림 골든타임</Text>
                <Text style={styles.guideText}>
                  {ALERT_CYCLES[tempCycleIndex]}시간 미접속 시 문자 발송
                </Text>
                
                <View style={styles.stepperContainer}>
                  <TouchableOpacity 
                    style={[styles.stepBtn, tempCycleIndex === 0 && { opacity: 0.3 }]} 
                    onPress={() => handleCycleChange('prev')}
                    disabled={tempCycleIndex === 0}
                  >
                    <ChevronLeft size={24} color="#6b7280" />
                  </TouchableOpacity>
                  
                  <View style={styles.cycleDisplay}>
                    <Text style={styles.cycleValueText}>{ALERT_CYCLES[tempCycleIndex]}시간</Text>
                    <View style={styles.cycleDetailBadge}>
                      <Text style={styles.cycleDetailText}>
                        🔔 {ALERT_CYCLES[tempCycleIndex] / 2}h  |  🚨 {ALERT_CYCLES[tempCycleIndex]}h
                      </Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity 
                    style={[styles.stepBtn, tempCycleIndex === ALERT_CYCLES.length - 1 && { opacity: 0.3 }]} 
                    onPress={() => handleCycleChange('next')}
                    disabled={tempCycleIndex === ALERT_CYCLES.length - 1}
                  >
                    <ChevronRight size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.saveBtn} onPress={saveMemberSettings}>
              <Text style={styles.saveBtnText}>저장하기</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

// 스타일은 민성님이 보내주신 그대로 유지 (아까 제가 드린 추가 스타일 포함됨)
const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f3f4f6' },
  sectionHeader: { marginBottom: 12, marginTop: 8 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  sectionSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  
  card: {
    backgroundColor: 'white', borderRadius: 20, padding: 24, marginBottom: 24,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 },

  halfContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  halfItem: {
    width: '48%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#f9fafb', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12,
  },
  label: { fontSize: 15, color: '#374151', fontWeight: '500' },

  // 방해금지 및 공통 스타일 (민성님 코드 + 제 추가 코드)
  settingItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  settingTextCol: { flex: 1, paddingRight: 16 },
  settingLabel: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 4 },
  settingDesc: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  
  dndTimeContainer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#f9fafb', padding: 16, borderRadius: 12, marginTop: -10, marginBottom: 20,
    borderWidth: 1, borderColor: '#e5e7eb'
  },
  timeButton: {
    backgroundColor: 'white', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8,
    alignItems: 'center', borderWidth: 1, borderColor: '#d1d5db', width: '40%'
  },
  timeLabel: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  timeValue: { fontSize: 18, fontWeight: 'bold', color: '#374151' },

  // 멤버 리스트 스타일
  premiumSectionContainer: { position: 'relative' },
  memberRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: 'white'
  },
  memberRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#f3f4f6',
    justifyContent: 'center', alignItems: 'center'
  },
  memberName: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  miniBadge: {
    backgroundColor: '#f3f4f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6
  },
  miniBadgeText: { fontSize: 11, color: '#4b5563', fontWeight: '600' },

  premiumOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 20,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, justifyContent: 'center', alignItems: 'center',
    padding: 24, zIndex: 10,
  },
  overlayTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  premiumBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  premiumBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  // 모달
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  settingsModalContent: {
    backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, height: '70%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  guideText: { fontSize: 13, color: '#9ca3af', marginBottom: 16 },

  selectorBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 16,
  },
  selectorText: { fontSize: 16, color: '#374151' },

  dropdownList: { backgroundColor: '#f9fafb', borderRadius: 12, marginTop: 8, padding: 8 },
  dropdownItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb'
  },
  dropdownItemText: { fontSize: 15, color: '#4b5563' },

  stepperContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8, marginBottom: 24 },
  stepBtn: { backgroundColor: '#f3f4f6', padding: 12, borderRadius: 12 },
  cycleDisplay: { alignItems: 'center', minWidth: 140 },
  cycleValueText: { fontSize: 28, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  cycleDetailBadge: {
    backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8
  },
  cycleDetailText: { fontSize: 11, color: '#3b82f6', fontWeight: '600' },

  saveBtn: {
    backgroundColor: '#3b82f6', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 'auto'
  },
  saveBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});