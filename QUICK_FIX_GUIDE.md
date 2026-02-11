# ⚡ 빠른 수정 가이드 (이미 GitHub에 Push한 경우)

## 🚨 현재 상황
이미 Supabase 키가 포함된 코드를 GitHub에 여러 번 Push함

## ✅ 해결 방법 (2가지 선택)

---

### 방법 1: 간단하지만 덜 안전 (추천: 개인 프로젝트)

#### 시간: 15분

1. **Supabase 키 재발급**
   ```
   1. https://supabase.com 로그인
   2. 프로젝트 선택
   3. Settings → API
   4. "Reset" 버튼 클릭 (Anon key 옆)
   5. 새 키 복사
   ```

2. **`.env` 파일 생성**
   ```bash
   # 프로젝트 루트에서
   cp .env.example .env
   
   # .env 파일 열어서 새 키 입력
   EXPO_PUBLIC_SUPABASE_URL=https://qeikodkvdzczerweonyb.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=(방금 복사한 새 키)
   ```

3. **앱 테스트**
   ```bash
   npm start
   # 로그인/회원가입이 정상 작동하는지 확인
   ```

4. **GitHub에 Push**
   ```bash
   git add .
   git commit -m "security: migrate to environment variables"
   git push
   ```

**장점**: 빠르고 간단  
**단점**: Git 히스토리에 여전히 옛날 키가 남아있음 (이미 무효화되었으므로 사용 불가)

---

### 방법 2: 완벽하게 안전 (추천: 오픈소스/팀 프로젝트)

#### 시간: 1시간

#### Step 1: Supabase 키 재발급 (위와 동일)

#### Step 2: GitHub 저장소 완전 재생성

```bash
# 1. 백업 생성
cd C:\Users\User\Desktop
cp -r Anbu Anbu_backup

# 2. GitHub에서 기존 저장소 삭제
# https://github.com/사용자명/저장소명/settings
# 맨 아래 "Delete this repository" 클릭

# 3. 로컬에서 Git 히스토리 삭제
cd Anbu
rm -rf .git

# 4. .env 파일 생성 (새 키 입력)
cp .env.example .env
# .env 파일 열어서 새 키 입력

# 5. 새로운 Git 초기화
git init
git add .
git commit -m "Initial commit"

# 6. GitHub에서 새 저장소 생성
# https://github.com/new
# 저장소 이름: musosik (또는 원하는 이름)

# 7. 새 저장소에 Push
git remote add origin https://github.com/사용자명/musosik.git
git branch -M main
git push -u origin main
```

**장점**: Git 히스토리가 완전히 깨끗함  
**단점**: 기존 커밋 히스토리 손실 (별 큰 문제 아님)

---

## 🎯 체크리스트

### 필수 (꼭 해야 함)
- [ ] Supabase Anon Key 재발급
- [ ] `.env` 파일 생성 및 새 키 입력
- [ ] 앱 정상 작동 확인
- [ ] `.env` 파일이 절대 커밋되지 않았는지 확인

### 권장 (시간 있으면)
- [ ] Git 히스토리 정리 (방법 2)
- [ ] RLS(Row Level Security) 활성화 확인
- [ ] Supabase 접근 로그 확인
- [ ] git-secrets 설치

### 나중에 (1주일 내)
- [ ] 비밀번호 변경 (Supabase, GitHub)
- [ ] 2FA 활성화
- [ ] 팀원들에게 보안 주의사항 공유

---

## ❓ 자주 묻는 질문

### Q1: 기존 키를 재발급하면 앱이 작동 안 하나요?
**A**: 네, 그래서 `.env` 파일에 새 키를 입력해야 합니다. 그러면 정상 작동합니다.

### Q2: Git 히스토리를 정리하지 않으면 위험한가요?
**A**: 키를 재발급했다면 옛날 키는 무효화되어 사용 불가합니다. 하지만 보안 모범 사례상 정리하는 것이 좋습니다.

### Q3: 이미 해킹당했을 가능성은?
**A**: Supabase에 RLS가 활성화되어 있다면 가능성이 낮습니다. 로그를 확인해보세요.

### Q4: EAS Build는 어떻게 하나요?
**A**: 다음 명령어로 시크릿 설정:
```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://..."
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "새키"
```

---

## 🆘 문제 발생 시

### 앱이 작동하지 않는 경우
1. `.env` 파일이 프로젝트 루트에 있는지 확인
2. 키를 올바르게 복사했는지 확인 (공백 없이)
3. `npm start` 재실행
4. 캐시 삭제: `npx expo start -c`

### Git Push가 안 되는 경우
```bash
# git-secrets가 차단하는 경우
git secrets --list  # 차단 패턴 확인
```

---

## 📞 도움 받기

- Discord: [Supabase Discord](https://discord.supabase.com)
- GitHub Discussions: 저장소의 Discussions 탭
- Stack Overflow: `supabase` 태그

---

**작성일**: 2026.02.11  
**난이도**: ⭐⭐☆☆☆ (방법 1) / ⭐⭐⭐☆☆ (방법 2)
