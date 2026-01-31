/**
 * useShakeDetector.ts
 * - 가속도계 기반 흔들기 감지 Hook
 */

import { useState } from 'react';
import { Accelerometer } from 'expo-sensors';

export function useShakeDetector() {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [subscription, setSubscription] = useState<any>(null);

  const start = () => {
    setProgress(0);
    setIsVisible(true);
    subscribe();
  };

  const subscribe = () => {
    const sub = Accelerometer.addListener(accelerometerData => {
      const { x, y, z } = accelerometerData;
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      
      if (magnitude > 1.5) {
        setProgress(prev => {
          const next = prev + 4;
          if (next >= 100) {
            unsubscribe();
            return 100;
          }
          return next;
        });
      }
    });
    
    setSubscription(sub);
    Accelerometer.setUpdateInterval(100);
  };

  const unsubscribe = () => {
    subscription && subscription.remove();
    setSubscription(null);
  };

  const close = () => {
    unsubscribe();
    setIsVisible(false);
    setProgress(0);
  };

  return {
    isVisible,
    progress,
    start,
    close,
    unsubscribe
  };
}
