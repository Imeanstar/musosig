// components/modals/MathChallengeModal.tsx - 수학 문제 모달 컴포넌트
import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { styles } from '../../styles/styles';
import { MathProblem } from '../../types';
import { MESSAGES } from '../../constants';

interface MathChallengeModalProps {
  visible: boolean;
  problem: MathProblem;
  onCorrectAnswer: () => void;
}

export const MathChallengeModal: React.FC<MathChallengeModalProps> = ({
  visible,
  problem,
  onCorrectAnswer,
}) => {
  const [userAnswer, setUserAnswer] = useState('');

  const handleSubmit = () => {
    const answerNum = parseInt(userAnswer);

    if (isNaN(answerNum)) {
      Alert.alert('알림', MESSAGES.MATH_INPUT_REQUIRED);
      return;
    }

    if (answerNum === problem.answer) {
      // 정답
      setUserAnswer('');
      onCorrectAnswer();
    } else {
      // 오답
      Alert.alert(MESSAGES.MATH_WRONG_ANSWER, MESSAGES.MATH_TRY_AGAIN);
      setUserAnswer('');
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.mathModalContainer}>
          <Text style={styles.mathModalTitle}>🧠 치매 예방 두뇌 훈련</Text>
          <Text style={styles.mathModalSubtitle}>문제를 풀고 출석해주세요!</Text>
          
          <Text style={styles.mathProblem}>
            {problem.num1} + {problem.num2} = ?
          </Text>
          
          <TextInput
            style={styles.mathInput}
            placeholder="정답 입력"
            value={userAnswer}
            onChangeText={setUserAnswer}
            keyboardType="number-pad"
            autoFocus
          />
          
          <TouchableOpacity style={styles.mathSubmitButton} onPress={handleSubmit}>
            <Text style={styles.mathSubmitButtonText}>확인</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
