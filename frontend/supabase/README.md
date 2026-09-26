# Supabase 연결 — 1단계

## 현재 상태
- SDK 설치, 연결 모듈, DB 초기 SQL 준비 완료.
- 아직 원격 프로젝트 생성/SQL 실행/실제 연결은 하지 않았습니다.
- 기존 로컬 학습 화면과 기록은 그대로 동작합니다.
- DB 테이블은 모두 외부 읽기/쓰기가 차단돼 있습니다.
  다음 단계에서 가족 인증·프로필 연결과 제한된 RPC를 구현한 후 사용합니다.

## 설정
1. https://supabase.com/dashboard 에서 새 프로젝트를 만듭니다.
2. 새 프로젝트 SQL Editor에서 migrations/202609260001_foundation.sql을 한 번 실행합니다.
3. Project URL과 Publishable key를 준비합니다. Secret/service_role 키는 사용하지 않습니다.
4. frontend/.env.local의 기존 내용을 보존하고 아래 항목만 추가합니다.
   VITE_SUPABASE_URL=https://프로젝트주소.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=공개키
5. 개발 서버를 재시작합니다.
6. 개발자 콘솔에서 다음으로 연결 확인:
   const {checkDatabaseConnection} = await import('/src/lib/supabase.js');
   await checkDatabaseConnection();
   connected:true, message:wordtop-v1이면 완료입니다.
7. Vercel에도 동일한 환경변수를 넣은 뒤 다시 빌드/배포합니다.

## 후속 단계
가족 초대·기기 인증 → 최초 프로필 선택 → 기존 기록 1회 이전
→ 사용자별 기록과 재전송 중복 방지 → 가족 현황 → 서버 검증 뱃지 지급.

뱃지 기준(현재 계획): 연속 정답 10/20/30회 각각 동/은/금 1개.
오답·시간 초과 때 새 연속 구간을 시작합니다. 재전송으로 중복 지급하지 않습니다.

## 2단계: 사용자 연결
1. SQL Editor에서 migrations/202609260002_profile_access.sql 실행.
2. SQL Editor에서 create-profile-codes.sql 실행.
   결과의 이름별 초대코드를 비공개로 보관하고 해당 가족에게 전달합니다.
   코드는 해당 프로필 접근권한이므로 GitHub나 공개 채팅에 올리지 않습니다.
   SQL 재실행 시 기존 초대코드를 교체합니다. 기존 기기 연결은 유지됩니다.
3. Supabase Authentication → Sign In / Providers에서 Anonymous Sign-Ins를 켭니다.
4. 개발 서버 재시작 후 프로필을 선택하고 해당 초대코드를 붙여넣습니다.
5. 최초 연결 시 기존 로컬 학습 기록을 가져올지 선택할 수 있습니다.
   로컬 기록은 프로필 ID별로 분리되며 원본은 보존됩니다.

현재 구현 범위: 서버에 기기-프로필 연결, 다음 방문 자동 프로필 복원,
로컬 학습 기록 사용자별 분리. 학습 기록의 서버 동기화와 뱃지는 다음 단계입니다.
익명 인증이므로 사이트 데이터를 삭제하거나 새 기기에서는 초대코드로 다시 연결합니다.
