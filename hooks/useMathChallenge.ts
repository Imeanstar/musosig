/**
 * useMathChallenge.ts
 * - 수학 문제 생성 및 검증 Hook
 */

import { useState } from 'react';
import { Alert } from 'react-native';

interface MathProblem {
  n1: number;
  n2: number;
  ans: number;
}

export function useMathChallenge() {
  const [problem, setProblem] = useState<MathProblem>({ n1: 0, n2: 0, ans: 0 });
  const [userAnswer, setUserAnswer] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  const generate = (difficulty: 'easy' | 'hard') => {
    let n1, n2;
    if (difficulty === 'easy') {
      n1 = Math.floor(Math.random() * 9) + 1; 
      n2 = Math.floor(Math.random() * 9) + 1;
    } else {
      n1 = Math.floor(Math.random() * 40) + 10;
      n2 = Math.floor(Math.random() * 40) + 10;
    }
    setProblem({ n1, n2, ans: n1 + n2 });
    setUserAnswer('');
    setIsVisible(true);
  };

  const check = (onSuccess: () => void) => {
    if (parseInt(userAnswer) === problem.ans) {
      setIsVisible(false);
      onSuccess();
    } else {
      Alert.alert("땡!", "다시 한번 천천히 계산해보세요. 할 수 있어요! 💪");
      setUserAnswer('');
    }
  };

  const close = () => {
    setIsVisible(false);
    setUserAnswer('');
  };

  return {
    problem,
    userAnswer,
    setUserAnswer,
    isVisible,
    generate,
    check,
    close
  };
}
