# WORDTOP — 집 PC에서 이어서 개발하기

## 2026-09-26 현재 구현
- 단어 퀴즈, 멈춤/시간 초과, 스크랩/마스터 분류와 ALL FEED 제외.
- 학습 위치 복원, ~ 기호 뜻 파싱, 모바일 레이아웃, 새 배포 알림.
- 업로드 PDF/DOCX/사진 OCR, 홈 화면 앱 설정.
- Supabase 연결 모듈 및 초기 SQL.
- 제이크/지니/새우깡/갈매기 프로필 선택, 초대코드로 기기 연결.
- 프로필별 로컬 기록 분리 및 기존 기록 1회 가져오기.

## 아직 구현하지 않은 것
- 학습시간/정오답 기록의 서버 동기화 및 오프라인 재전송.
- 가족 현황, 하단 메뉴 개편.
- 서버에서 검증하는 동/은/금 뱃지 지급과 보관함.
- 실제 기기의 프로필 연결 end-to-end 확인.
  프로필 UI는 모의 API 테스트, 퀴즈/파싱은 테스트 및 빌드 통과.

## 서버 상태
- 초기 DB health 응답 wordtop-v1 확인됨.
- 사용자 보고: profile_access 및 초대코드 SQL 실행 완료.
- Anonymous Sign-Ins 활성화·저장 완료 여부 확인 필요.
- SQL 전체를 다시 실행하지 마세요.
- create-profile-codes.sql 재실행은 초대코드를 교체합니다.
- 이 문서 작성 시 GitHub push / Vercel 배포는 실행 환경 권한 문제로 완료되지 않음.

## 출발 전 현재 PC에서 업로드
프로젝트 루트에서:
git add frontend .gitignore WordTop.code-workspace CONTINUE_AT_HOME.md 2027.json
git diff --cached --stat
git commit -m "Add family profiles and Supabase setup; fix study resume"
git push origin main

## 집 PC
기존 저장소가 있다면 수정 중인 파일을 먼저 보관하고:
git pull --ff-only origin main

새로 받는다면:
git clone https://github.com/JK17-ai/wordtop.git
cd wordtop

그다음:
cd frontend
npm ci

.env.example을 .env.local로 복사하고 다음 값을 설정:
VITE_SUPABASE_URL = Supabase 프로젝트의 Project URL
VITE_SUPABASE_PUBLISHABLE_KEY = Supabase Publishable key
Secret/service_role 키 사용 금지.
.env.local은 GitHub/이 압축본에 포함되지 않습니다.

npm run dev
터미널의 Local 주소를 열어 본인 프로필과 보관한 초대코드로 접속.

## Vercel
Settings > Environment Variables에 위 두 환경변수를 Production/Preview에 등록.
Settings > Git에서 JK17-ai/wordtop, production branch main 연결 확인.
Git 기반 빌드의 Root Directory는 frontend, 프레임워크 Vite.
환경변수 추가 후 재배포 필요.
기존 CLI 링크 .vercel은 이 PC 전용이고 GitHub/압축본에 포함되지 않음.

## 다음 작업
실기기 프로필 인증 확인 → 사용자별 서버 학습 기록 → 가족 현황 → 뱃지.
프로필 이름만으로 DB 권한을 부여하지 말고 auth.uid()와 profile_accounts 연결 사용.
뱃지는 현재 계획상 연속 정답 10/20/30회, 구간별 각 등급 1회 지급.
개인 초대코드와 인증키는 저장소에 넣지 말 것.
