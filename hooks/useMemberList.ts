/**
 * useMemberList.ts
 * 
 * Manager의 멤버 목록 관리 Hook
 * - 멤버 조회
 * - 오늘 체크인 상태 확인
 * - 새로고침
 * 
 * @extracted from ManagerMain.tsx (148-208줄)
 */

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { UserInfo } from '../types';

interface MemberData extends UserInfo {
  is_safe_today?: boolean;
}

interface UseMemberListReturn {
  members: MemberData[];
  isLoading: boolean;
  refreshing: boolean;
  fetchMembers: () => Promise<void>;
  onRefresh: () => void;
}

export const useMemberList = (managerId: string | undefined): UseMemberListReturn => {
  const [members, setMembers] = useState<MemberData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * 멤버 목록 조회 (오늘 체크인 상태 포함)
   */
  const fetchMembers = async () => {
    if (!managerId) return;

    setIsLoading(true);
    try {
      // 1. 멤버 목록 조회
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('manager_id', managerId);

      if (error) throw error;

      // 2. 각 멤버의 오늘 체크인 여부 확인
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
      console.log('[MemberList] 조회 완료:', membersWithStatus.length, '명');

    } catch (e) {
      console.error('[MemberList] 조회 실패:', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * 새로고침 핸들러
   */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMembers();
  }, [managerId]);

  return {
    members,
    isLoading,
    refreshing,
    fetchMembers,
    onRefresh,
  };
};
