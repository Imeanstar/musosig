// contexts/UserContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {UserInfo} from './../types/index'

interface UserContextType {
  userInfo: UserInfo | null;
  setUserInfo: (user: UserInfo | null) => void;
}

// 1. 공용 저장소(Context) 생성
const UserContext = createContext<UserContextType | undefined>(undefined);

// 2. 우산(Provider) 만들기 - 이 우산 아래에 있는 컴포넌트들은 다 데이터를 공유함
export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  return (
    <UserContext.Provider value={{ userInfo, setUserInfo }}>
      {children}
    </UserContext.Provider>
  );
};

// 3. 쉽게 갖다 쓰는 훅
export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUserContext must be used within a UserProvider');
  return context;
};