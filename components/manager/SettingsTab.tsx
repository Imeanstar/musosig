/**
 * SettingsTab.tsx (v2.3 - Show Window Strategy Applied)
 * - 🔓 멤버 리스트 잠금 해제 (무료 유저도 진입 가능)
 * - 🔒 개별 옵션(성경, 사진 등) 및 골든타임 설정에 프리미엄 락 적용
 */

import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, 
  Alert, Modal, FlatList
} from 'react-native';
import { ChevronRight, ChevronLeft, Check, User as UserIcon, X, Lock } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Member, UserSettings } from '../../types'; 

interface SettingsTabProps {
  isPremium: boolean;
  onUpgradePress: () => void;
  members: Member[];
  onUpdateMemberSetting: (memberId: string, settings: any) => void;
  onUpdateManagerSettings?: (settings: UserSettings) => void;
  managerSettings?: UserSettings; 
}

const CHECK_IN_OPTIONS = [
  { label: '기본 클릭 (터치)', value: '클릭', isPremium: false },
  { label: '산수 문제 (쉬움)', value: '수학(EASY)', isPremium: false }, // 무료
  { label: '산수 문제 (어려움)', value: '수학(HARD)', isPremium: true },
  { label: '사진 인증', value: '사진인증', isPremium: true },
  { label: '휴대폰 흔들기', value: '흔들기', isPremium: false }, // 무료
  { label: '성경 말씀', value: '성경말씀', isPremium: true },
];

const ALERT_CYCLES = [48, 72, 96]; 

export function SettingsTab({ 
  isPremium, 
  onUpgradePress, 
  members, 
  onUpdateMemberSetting,
  onUpdateManagerSettings,
  managerSettings = {} 
}: SettingsTabProps) {

  // --- [1] 매니저 앱 설정 상태 ---
  const [tempSettings, setTempSettings] = useState<UserSettings>(managerSettings);
  const [showTimePicker, setShowTimePicker] = useState<'start' | 'end' | null>(null);

  useEffect(() => {
    setTempSettings(managerSettings);
  }, [managerSettings]);

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
    // 🔓 [수정] 프리미엄 체크 제거! 누구나 열 수 있음
    setSelectedMember(member);
    setTempMethod(member.settings?.checkInMethod || '클릭');
    const currentCycle = member.settings?.alertCycle || 48;
    const idx = ALERT_CYCLES.indexOf(currentCycle);
    setTempCycleIndex(idx >= 0 ? idx : 0);
    setIsModalOpen(true);
    setIsDropdownOpen(false); 
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

  // 🔒 [수정] 골든타임 변경 핸들러 (프리미엄 체크)
  const handleCycleChange = (direction: 'prev' | 'next') => {
    if (!isPremium) {
      Alert.alert(
        "프리미엄 기능 🔒", 
        "비상 알림 골든타임 변경은 프리미엄 기능입니다.\n기본 48시간으로 제공됩니다.",
        [
            { text: "취소", style: "cancel" },
            { text: "확인", onPress: () => {} } 
        ]
      );
      return;
    }

    if (direction === 'prev') setTempCycleIndex(prev => Math.max(0, prev - 1));
    else setTempCycleIndex(prev => Math.min(ALERT_CYCLES.length - 1, prev + 1));
  };

  // 🔒 옵션 선택 핸들러 (프리미엄 체크)
  const handleSelectOption = (option: typeof CHECK_IN_OPTIONS[0]) => {
    if (option.isPremium && !isPremium) {
      Alert.alert(
        "프리미엄 기능 🔒", 
        `'${option.label}' 기능은 프리미엄 회원 전용입니다.\n구독 후 이용해주세요!`,
        [
            { text: "취소", style: "cancel" },
            { text: "확인", onPress: () => {} } 
        ]
      );
      return;
    }
    setTempMethod(option.value);
    setIsDropdownOpen(false);
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

      {/* 방해금지 섹션 */}
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
        {/* 🚨 [수정됨] minHeight 제거 & maxHeight 적용 & 내부 ScrollView 추가 */}
        <View style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
          
          {members.length === 0 ? (
             /* 🅰️ 멤버가 없을 때: 안내 메시지 */
             <View style={{ padding: 32, alignItems: 'center', justifyContent: 'center' }}>
               <UserIcon size={48} color="#e5e7eb" style={{ marginBottom: 12 }} />
               <Text style={{ fontSize: 16, fontWeight: '600', color: '#4b5563', marginBottom: 4 }}>
                 등록된 멤버가 없습니다
               </Text>
               <Text style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>
                 '내 멤버' 탭에서 멤버를 추가하면{'\n'}맞춤 설정을 할 수 있어요!
               </Text>
             </View>
          ) : (
            /* 🅱️ 멤버가 있을 때: 스크롤 영역 (최대 높이 제한) */
            <ScrollView 
              style={{ maxHeight: 300 }} // 👈 여기가 핵심! (300px 넘으면 스크롤)
              nestedScrollEnabled={true} // 부모 스크롤뷰 안에서도 스크롤 되게 함
              showsVerticalScrollIndicator={true}
            >
              {members.map((member, index) => (
                <TouchableOpacity 
                  key={member.id} 
                  style={[
                    styles.memberRow, 
                    index !== members.length - 1 && styles.memberRowBorder
                  ]}
                  onPress={() => openMemberSettings(member)}
                  disabled={false} 
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
                            {CHECK_IN_OPTIONS.find(o => o.value === member.settings?.checkInMethod)?.label || '기본 클릭'}
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
              ))}
            </ScrollView>
          )}
        </View>
      </View>


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
              {/* 인증 방식 선택 */}
              <Text style={styles.settingLabel}>출석 인증 방식</Text>
              <TouchableOpacity 
                style={styles.selectorBtn} 
                onPress={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <Text style={styles.selectorText}>
                  {CHECK_IN_OPTIONS.find(opt => opt.value === tempMethod)?.label || tempMethod}
                </Text>
                <ChevronRight size={24} color="#9ca3af" style={{ transform: [{ rotate: isDropdownOpen ? '270deg' : '90deg' }] }} />
              </TouchableOpacity>
              
              {/* 드롭다운 리스트 */}
              {isDropdownOpen && (
                <View style={styles.dropdownList}>
                  {CHECK_IN_OPTIONS.map((opt) => {
                    const isLocked = opt.isPremium && !isPremium;

                    return (
                      <TouchableOpacity 
                        key={opt.value} 
                        style={[
                          styles.dropdownItem,
                          isLocked && { opacity: 0.6 }
                        ]}
                        onPress={() => handleSelectOption(opt)}
                      >
                        <View style={{flexDirection:'row', alignItems:'center'}}>
                          {isLocked && (
                             <Lock size={14} color="#ef4444" style={{marginRight: 6}} />
                          )}
                          <Text style={[
                            styles.dropdownItemText, 
                            tempMethod === opt.value && { color: '#3b82f6', fontWeight: 'bold' },
                            isLocked && { color: '#6b7280' } 
                          ]}>
                            {opt.label}
                          </Text>
                          {opt.isPremium && !isLocked && (
                             <View style={styles.premiumBadgeMini}>
                               <Text style={styles.premiumBadgeText}>Premium</Text>
                             </View>
                          )}
                        </View>
                        {tempMethod === opt.value && <Check size={16} color="#3b82f6"/>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <View style={{ height: 24 }} />

              {/* 🔒 [수정] 알림 주기 설정 (프리미엄 표시 추가) */}
              <View>
                <View style={{flexDirection:'row', alignItems:'center'}}>
                    <Text style={styles.settingLabel}>비상 알림 골든타임</Text>
                    {/* 프리미엄 유저가 아니면 뱃지 표시 */}
                    {!isPremium && (
                        <View style={[styles.premiumBadgeMini, {marginTop: 0, marginBottom: 4}]}>
                           <Text style={styles.premiumBadgeText}>Premium</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.guideText}>
                  {ALERT_CYCLES[tempCycleIndex]}시간 미접속 시 문자 발송
                </Text>
                
                <View style={[styles.stepperContainer, !isPremium && { opacity: 0.5 }]}> 
                  <TouchableOpacity 
                    style={[styles.stepBtn, tempCycleIndex === 0 && { opacity: 0.3 }]} 
                    onPress={() => handleCycleChange('prev')}
                    disabled={tempCycleIndex === 0} // 락은 함수 내부에서 처리하므로 버튼 자체는 활성
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

  // 방해금지
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

  // 멤버 리스트
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

  dropdownList: { backgroundColor: '#f9fafb', borderRadius: 12, marginTop: 8, padding: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  dropdownItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb'
  },
  dropdownItemText: { fontSize: 15, color: '#4b5563' },
  
  premiumBadgeMini: {
    backgroundColor: '#eff6ff', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8,
    borderWidth: 1, borderColor: '#bfdbfe'
  },
  premiumBadgeText: { fontSize: 10, color: '#3b82f6', fontWeight: 'bold' },

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