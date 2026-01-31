/**
 * useCameraCapture.ts
 * - 카메라 촬영 및 사진 관리 Hook
 */

import { useState, useRef } from 'react';
import { Alert } from 'react-native';
import { useCameraPermissions } from 'expo-camera';

export function useCameraCapture() {
  const [isVisible, setIsVisible] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  const open = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert("권한 필요", "사진을 찍으려면 카메라 권한이 필요합니다.");
        return;
      }
    }
    setPhotoUri(null);
    setIsVisible(true);
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.4,
        skipProcessing: true,
      });
      setPhotoUri(photo.uri);
    }
  };

  const retake = () => setPhotoUri(null);

  const close = () => {
    setIsVisible(false);
    setPhotoUri(null);
  };

  return {
    isVisible,
    photoUri,
    cameraRef,
    open,
    takePicture,
    retake,
    close
  };
}
