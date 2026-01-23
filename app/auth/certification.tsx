import React from 'react';
import IMP from 'iamport-react-native';
import { useUserManagement } from '../../hooks/useUserManagement';
import { useRouter } from 'expo-router';
import { Alert, View } from 'react-native';

// 1. 👇 이 인터페이스(Type)를 추가해주세요.
interface IamportResponse {
    success: boolean;
    imp_uid: string;      // 포트원 고유 ID
    merchant_uid: string; // 주문번호
    error_msg?: string;   // 에러 메시지 (실패 시에만 있음)
    error_code?: string;  // 에러 코드
  }

export default function Certification() {
  const router = useRouter();
  const { signUpWithEmail } = useUserManagement(); // 가입 함수

  /* [필수입력] 본인인증 종료 후 실행될 콜백 함수 */
  function callback(response: IamportResponse) {
    const { success, error_msg, imp_uid, merchant_uid } = response;

    if (success) {
      // ✅ 인증 성공!
      console.log('인증 성공! 고유 ID(imp_uid):', imp_uid);
      
      // ⚠️ 중요: 여기서 바로 가입시키면 안 되고,
      // 서버(Supabase Edge Function 등)에서 imp_uid로 포트원 API를 조회해서
      // 진짜 'CI 값'과 '전화번호'를 가져와야 가장 안전합니다.
      // (하지만 일단 간단한 로직 흐름은 아래와 같습니다)
      
      Alert.alert('인증 성공', '본인 인증이 완료되었습니다.', [
        { 
          text: '확인', 
          onPress: () => {
             // 여기서 얻은 정보로 회원가입 로직으로 이동 or 실행
             // router.push({ pathname: '/signup/finish', params: { imp_uid } });
          } 
        }
      ]);
      
    } else {
      // ❌ 인증 실패/취소
      Alert.alert('인증 실패', error_msg);
      router.back();
    }
  }

  /* [필수입력] 본인인증 데이터 */
  const data = {
    merchant_uid: `mid_${new Date().getTime()}`,
    company: '아임포트',
    carrier: 'SKT', // 통신사 (생략 가능)
    name: '홍길동', // 이름 (생략 가능)
    phone: '01012341234', // 전화번호 (생략 가능)
  };

  return (
    <IMP.Certification
      userCode="imp00000000"  // ⚠️ 포트원 가맹점 식별코드 (본인 거 넣으세요)
      tierCode={undefined}    // 티어 코드: agency 기능 사용자에 한함
      loading={<View style={{flex: 1}} />} // 로딩 컴포넌트
      data={data}             // 본인인증 데이터
      callback={callback}     // 본인인증 종료 후 콜백
    />
  );
}