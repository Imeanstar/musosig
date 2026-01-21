import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface RoleSelectionProps {
  onRoleSelect: (role: 'manager' | 'member') => void;
}

export function RoleSelection({ onRoleSelect }: RoleSelectionProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>무소식</Text>
        <Text style={styles.subtitle}>무소식이 희소식</Text>
      </View>

      <View style={styles.buttonContainer}>
        {/* 매니저 버튼 (파란색) */}
        <TouchableOpacity
          onPress={() => onRoleSelect('manager')}
          activeOpacity={0.9}
          style={styles.cardWrapper}
        >
          <LinearGradient
            colors={['#3b82f6', '#14b8a6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>희소식</Text>
            <Text style={styles.cardSubtitle}>(소식 받기)</Text>
            <Text style={styles.cardDesc}>가족, 친구의 안부를 확인하고 싶으신가요?</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* 멤버 버튼 (주황색 - 더 큼) */}
        <TouchableOpacity
          onPress={() => onRoleSelect('member')}
          activeOpacity={0.9}
          style={styles.cardWrapper}
        >
          <LinearGradient
            colors={['#fb923c', '#ea580c']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.card, styles.largeCard]}
          >
            <Text style={[styles.cardTitle, styles.largeText]}>무소식</Text>
            <Text style={[styles.cardSubtitle, styles.largeText]}>(안부 전하기)</Text>
            <Text style={styles.cardDesc}>매일매일 나의 안부를 전해주세요.</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb', padding: 20 },
  header: { marginBottom: 60, alignItems: 'center' },
  title: { fontSize: 48, fontWeight: 'bold', color: '#1f2937', marginBottom: 8 },
  subtitle: { fontSize: 20, color: '#6b7280' },
  buttonContainer: { width: '100%', gap: 24, maxWidth: 400 },
  cardWrapper: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  card: { borderRadius: 20, padding: 32, alignItems: 'center' },
  largeCard: { paddingVertical: 48 },
  cardTitle: { color: 'white', fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  largeText: { fontSize: 36 },
  cardSubtitle: { color: 'white', fontSize: 18, marginBottom: 12 },
  cardDesc: { color: 'rgba(255,255,255,0.9)', fontSize: 16, textAlign: 'center' },
});