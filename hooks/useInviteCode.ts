/**
 * useInviteCode.ts
 * 
 * 초대 코드 생성 및 관리 Hook
 * - 신규 멤버 초대 코드 생성
 * - 재연결 코드 생성 (기기 변경 시)
 * 
 * @extracted from ManagerMain.tsx (76-138줄)
 */

import { useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';

interface UseInviteCodeReturn {
  isCodeLoading: boolean;
  generateInviteCode: (managerId: string, nickname: string, relation: string) => Promise<string>;
  generateRelinkCode: (memberId: string) => Promise<string>;
}

export const useInviteCode = (): UseInviteCodeReturn => {
  const [isCodeLoading, setIsCodeLoading] = useState(false);

  /**
   * 6자리 랜덤 코드 생성
   */
  const generateRandomCode = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  /**
   * 만료 시간 생성 (10분 후)
   */
  const getExpiryTime = (): string => {
    return new Date(Date.now() + 10 * 60 * 1000).toISOString();
  };

  /**
   * 신규 멤버 초대 코드 생성
   */
  const generateInviteCode = async (
    managerId: string, 
    nickname: string, 
    relation: string
  ): Promise<string> => {
    setIsCodeLoading(true);

    try {
      const newCode = generateRandomCode();
      const expiresAt = getExpiryTime();

      const { error } = await supabase
        .from('users')
        .update({ 
          pairing_code: newCode,
          pairing_code_expires_at: expiresAt,
          pending_member_nickname: nickname,
          pending_member_relation: relation
        })
        .eq('id', managerId);

      if (error) throw error;

      console.log('[InviteCode] 생성 완료:', newCode);
      return newCode;

    } catch (e) {
      console.error('[InviteCode] 생성 실패:', e);
      Alert.alert('오류', '코드를 생성하지 못했습니다.');
      return '';
    } finally {
      setIsCodeLoading(false);
    }
  };

  /**
   * 재연결 코드 생성 (기기 변경 시)
   */
  const generateRelinkCode = async (memberId: string): Promise<string> => {
    setIsCodeLoading(true);

    try {
      const newCode = generateRandomCode();
      const expiresAt = getExpiryTime();

      // RPC 함수 호출 (DB에 정의된 함수)
      const { error } = await supabase.rpc('generate_relink_code', {
        target_member_id: memberId,
        new_code: newCode,
        expires_at: expiresAt
      });

      if (error) throw error;

      console.log('[InviteCode] 재연결 코드 생성 완료:', newCode);
      return newCode;

    } catch (e: any) {
      console.error('[InviteCode] 재연결 코드 생성 실패:', e);
      Alert.alert('오류', '코드를 생성하지 못했습니다. (권한 오류 등)');
      return '';
    } finally {
      setIsCodeLoading(false);
    }
  };

  return {
    isCodeLoading,
    generateInviteCode,
    generateRelinkCode,
  };
};
