import { useEffect } from 'react';
import { Alert } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';

// 🔥 디버깅을 위해 props나 조건문을 다 무시하고 단순화했습니다.
export const useDeepLink = ({ onAuthSuccess, onAuthError }: any = {}) => {

  const extractParamsFromUrl = (url: string): Record<string, string> => {
    const params: Record<string, string> = {};
    const hashSplit = url.split('#');
    const querySplit = url.split('?');
    const queryString = hashSplit.length > 1 ? hashSplit[1] : (querySplit.length > 1 ? querySplit[1] : null);

    if (queryString) {
      queryString.split('&').forEach((param) => {
        const [key, value] = param.split('=');
        if (key && value) {
          params[key] = decodeURIComponent(value.replace(/\+/g, ' '));
        }
      });
    }
    return params;
  };

  const handleDeepLink = async (event: { url: string }) => {
    // 🔍 1. 링크 수신 확인
    if (!event.url) return;
    if (event.url.startsWith('exp://') || event.url.startsWith('http://localhost')) return;

    // 🚨 여기서 알림이 안 뜨면 -> 앱 설정(scheme) 문제
    Alert.alert('1. 링크 감지됨!', event.url);
    console.log('🔗 [Debug] URL:', event.url);

    try {
      const params = extractParamsFromUrl(event.url);

      // 🔍 2. 파라미터 확인
      // 내용이 비어있으면 파싱 로직 문제
      Alert.alert('2. 파라미터 분석', JSON.stringify(params, null, 2));

      // 에러 체크
      if (params.error || event.url.includes('error=')) {
        Alert.alert('❌ OAuth 에러', params.error_description || '알 수 없는 에러');
        WebBrowser.dismissBrowser();
        return;
      }

      // 토큰 체크
      if (params.access_token && params.refresh_token) {
        Alert.alert('3. 토큰 발견', '세션 설정을 시작합니다.');

        const { data, error } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });

        if (error) {
          Alert.alert('❌ 세션 설정 실패', error.message);
          WebBrowser.dismissBrowser();
        } else {
          // 🔍 4. 최종 성공
          Alert.alert('🎉 4. 로그인 성공!', '메인으로 이동합니다.');
          WebBrowser.dismissBrowser();
          if (onAuthSuccess) onAuthSuccess();
        }
      } else {
        Alert.alert('⚠️ 토큰 없음', 'URL은 왔는데 access_token이 안 보입니다.');
      }

    } catch (e: any) {
      Alert.alert('💥 예외 발생', e.message);
      WebBrowser.dismissBrowser();
    }
  };

  useEffect(() => {
    // 앱이 켜져있을 때
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // 앱이 꺼져있다가 켜질 때 (Cold Start)
    Linking.getInitialURL().then((url) => {
      if (url && !url.startsWith('exp://')) {
        Alert.alert('0. 초기 실행 감지', url); 
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return { handleDeepLink };
};