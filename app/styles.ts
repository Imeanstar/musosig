import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' },
  loadingContainer: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  header: { position: 'absolute', top: 60, left: 0, right: 0, paddingHorizontal: 20 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingsIcon: { padding: 8 },
  dateText: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  greetingText: { fontSize: 16, color: '#4b5563', marginTop: 4 },
  checkButton: { width: 300, height: 300, borderRadius: 150, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  buttonUnchecked: { backgroundColor: '#ef4444' },
  buttonChecked: { backgroundColor: '#22c55e' },
  buttonText: { fontSize: 36, fontWeight: 'bold', color: 'white' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: 'white', padding: 24, borderRadius: 16, width: '85%' },
  settingsModalContainer: { backgroundColor: 'white', padding: 24, borderRadius: 16, width: '90%' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 8, textAlign: 'center', color: '#1f2937' },
  modalSubtitle: { fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' },
  inputLabel: { fontSize: 14, fontWeight: 'bold', marginBottom: 4, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 16 },
  registerButton: { backgroundColor: '#3b82f6', padding: 16, borderRadius: 8, alignItems: 'center' },
  registerButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  contactsList: { maxHeight: 150, marginBottom: 10 },
  contactItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: '#f9fafb', borderRadius: 8, marginBottom: 8 },
  contactText: { fontSize: 16 },
  removeButton: { color: '#ef4444', fontWeight: 'bold' },
  addContactRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  addContactInput: { flex: 1, marginBottom: 0 },
  addButton: { backgroundColor: '#10b981', justifyContent: 'center', paddingHorizontal: 16, borderRadius: 8 },
  addButtonText: { color: 'white', fontWeight: 'bold' },
  settingsModalButtons: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  modalButton: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: '#f3f4f6' },
  cancelButtonText: { color: '#333', fontWeight: 'bold' },
  saveButton: { backgroundColor: '#3b82f6' },
  saveButtonText: { color: 'white', fontWeight: 'bold' },
  resetButton: { padding: 12, alignItems: 'center', marginTop: 10 },
  resetButtonText: { color: '#ef4444', fontWeight: 'bold' },
  
  // Premium 관련 스타일
  premiumBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 8 },
  premiumBadgeText: { fontSize: 14, fontWeight: 'bold', color: '#92400e', marginLeft: 6 },
  
  // 수학 문제 모달 스타일
  mathModalContainer: { backgroundColor: 'white', padding: 32, borderRadius: 20, width: '90%', alignItems: 'center' },
  mathModalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 8, color: '#1f2937' },
  mathModalSubtitle: { fontSize: 16, color: '#6b7280', marginBottom: 24, textAlign: 'center' },
  mathProblem: { fontSize: 48, fontWeight: 'bold', color: '#3b82f6', marginBottom: 24 },
  mathInput: { borderWidth: 2, borderColor: '#3b82f6', borderRadius: 12, padding: 16, fontSize: 32, width: '100%', textAlign: 'center', marginBottom: 20, fontWeight: 'bold' },
  mathSubmitButton: { backgroundColor: '#3b82f6', padding: 18, borderRadius: 12, width: '100%', alignItems: 'center' },
  mathSubmitButtonText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  
  // Premium 테스트 스위치
  premiumTestRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fef3c7', borderRadius: 12, marginBottom: 16 },
  premiumTestLabel: { fontSize: 16, fontWeight: 'bold', color: '#92400e' },
  
  // 법률 문서 메뉴 스타일
  legalMenuSection: { marginBottom: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 16 },
  legalMenuItem: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#f9fafb', borderRadius: 10, marginBottom: 10 },
  legalMenuText: { fontSize: 16, color: '#374151', marginLeft: 12, fontWeight: '500' }
});