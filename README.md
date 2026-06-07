# BookLog

BookLog는 사용자의 독서 기록, 리뷰, 문장 노트, RBTI 독서 성향을 관리하는 모바일 앱 프로젝트입니다.  
프론트엔드는 React Native / Expo, 백엔드는 Django REST Framework로 구성되어 있으며, 도서 검색에는 Kakao Book API와 도서관 정보나루 API를 사용합니다. 리뷰 텍스트는 로컬 AI 모델을 통해 RBTI 축별 성향 분석에 활용됩니다.

## 주요 기능

- 회원가입, 로그인, JWT 기반 인증
- Kakao Book API 기반 도서 검색 및 상세 조회
- 내 서재 등록, 읽고 싶은 책 / 읽는 중 / 완료 상태 관리
- 리뷰 작성, 수정, 삭제, 좋아요
- 문장 노트 작성 및 관리
- RBTI 설문 제출, 현재 RBTI 및 변경 이력 조회
- 리뷰 기반 AI RBTI 분석 및 RBTI별 도서 추천
- Swagger / Redoc 기반 API 문서 제공

## 기술 스택

### Backend

- Python
- Django 5
- Django REST Framework
- Simple JWT
- PostgreSQL
- drf-spectacular
- PyTorch / Transformers

### Frontend

- React Native
- Expo
- TypeScript
- React Navigation
- Zustand
- Axios

## 프로젝트 구조

```text
booklog/
├─ ai/                    # RBTI AI 모델 로더, predictor, 공통 상수
├─ backend/               # Django REST API 서버
│  ├─ analytics/           # 리뷰 분석 결과 및 추천 통계
│  ├─ books/               # 도서 검색, 외부 API 연동, 도서 저장
│  ├─ reading/             # 내 서재, 책장 상태 관리
│  ├─ reviews/             # 리뷰, 좋아요, 문장 노트
│  ├─ rbti/                # RBTI 유형, 설문, 사용자 RBTI 이력
│  ├─ users/               # 사용자, 인증
│  └─ config/              # Django 설정, 라우팅
├─ frontend/              # Expo 모바일 앱
│  ├─ src/api/             # 백엔드 API 클라이언트
│  ├─ src/components/      # 공통 UI 컴포넌트
│  ├─ src/navigation/      # 앱 네비게이션
│  ├─ src/screens/         # 화면 단위 구현
│  └─ src/store/           # 전역 상태 관리
├─ sentiment_compat.py    # 모델 호환용 공통 코드
└─ README.md
```

## 실행 준비

### 1. Backend 환경 변수

`backend/.env` 파일을 만들고 아래 값을 로컬 환경에 맞게 설정합니다.

```env
DJANGO_SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=booklog
DB_USER=postgres
DB_PASSWORD=your-password
DB_HOST=localhost
DB_PORT=5432

KAKAO_REST_API_KEY=your-kakao-rest-api-key
DATA4LIBRARY_AUTH_KEY=your-data4library-auth-key
```

`KAKAO_REST_API_KEY`는 도서 검색에 필요합니다. `DATA4LIBRARY_AUTH_KEY`는 도서 설명, KDC, 주제 분류 보강에 사용되며 없어도 일부 기능은 동작하도록 하였습니다.

### 2. AI 모델 파일 배치

AI 모델 가중치는 파일 용량이 커서 Git 저장소에는 포함하지 못했습니다. 로컬에서 아래 구조로 모델 파일을 별도로 배치해야 리뷰 기반 RBTI 분석 기능이 정상 동작합니다.

```text
ai/
└─ models/
   ├─ model_axis1_RI/
   ├─ model_axis2_AE/
   └─ model_axis3_NS/
```

각 모델 폴더에는 `config.json`, 토크나이저 파일, `model.safetensors` 또는 `pytorch_model.bin`이 필요합니다.

## Backend 실행

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_shelves
python manage.py seed_rbti_types
python manage.py runserver
```

서버 실행 후 주요 경로는 다음과 같습니다.

- Health check: `http://127.0.0.1:8000/api/health/`
- Swagger: `http://127.0.0.1:8000/api/docs/`
- Redoc: `http://127.0.0.1:8000/api/redoc/`
- Admin: `http://127.0.0.1:8000/admin/`

## Frontend 실행

```bash
cd frontend
npm install
npm start
```

안드로이드 에뮬레이터로 실행할 경우:

```bash
npm run android
```

웹으로 실행할 경우:

```bash
npm run web
```

백엔드 주소는 `frontend/src/constants/config.ts`의 `API_BASE_URL`에서 관리합니다. 로컬 서버를 직접 사용할 경우 예시는 다음과 같습니다.

```ts
export const API_BASE_URL = 'http://127.0.0.1:8000/api';
```

실제 기기에서 Expo 앱을 실행할 때는 `127.0.0.1`이 기기 자신을 의미하므로, 같은 Wi-Fi에 연결된 PC의 내부 IP 또는 ngrok 주소를 사용해야 합니다.

## 주요 API Prefix

- `POST /api/users/signup/` 회원가입
- `POST /api/users/login/` 로그인
- `POST /api/users/token/refresh/` 토큰 재발급
- `GET /api/users/me/` 내 정보
- `GET /api/books/search/` 도서 검색
- `POST /api/books/import/` 외부 도서 가져오기
- `GET /api/books/recommendations/rbti/` RBTI 기반 추천
- `GET, POST /api/reading/user-books/` 내 서재 목록 / 등록
- `GET, POST /api/reviews/` 리뷰 목록 / 작성
- `GET, POST /api/reviews/quotes/` 문장 노트 목록 / 작성
- `GET /api/rbti/types/` RBTI 유형 목록
- `GET /api/rbti/questions/` RBTI 설문 문항
- `POST /api/rbti/submit/` RBTI 설문 제출
- `GET /api/rbti/history/` RBTI 이력

자세한 요청/응답 스키마는 실행 후 Swagger 문서에서 확인할 수 있습니다.

## Git 포함 범위

이 저장소는 소스 코드와 실행에 필요한 핵심 설정 파일만 Git에 포함하고, 용량이 크거나 실행 환경에 종속되는 파일은 제외합니다.

Git에 포함되는 주요 파일은 다음과 같습니다.

- `backend/`의 Django 애플리케이션 코드, 마이그레이션, 라우팅, 서비스, 테스트 파일
- `frontend/`의 React Native / Expo 코드, 화면, 컴포넌트, 상태 관리, 네비게이션, 설정 파일
- `ai/`의 추론 로직 코드와 헬퍼 코드
- `sentiment_compat.py`
- 프론트엔드 정적 자산 이미지 파일

Git에서 제외되는 주요 파일은 다음과 같습니다.

- `ai/models/` 아래의 AI 모델 파일 전체
- `*.safetensors`, `*.bin`, `*.pt`, `*.pth` 같은 대용량 모델 가중치 파일
- `backend/.env` 같은 환경 변수 파일
- `backend/ngrok.yml` 같은 로컬 실행용 설정 파일
- `backend/venv/` 같은 Python 가상환경
- `__pycache__/`, `*.pyc` 같은 Python 캐시 파일
- `frontend/node_modules/` 같은 프론트엔드 의존성 폴더
- `.vscode/` 같은 개인 편집기 설정 파일

AI 모델 파일은 용량이 크고 바이너리 형식이라 Git 저장소에 올리면 저장소가 불필요하게 무거워져 불가피하게 제외하였습니다.
환경 변수, 가상환경, 캐시 파일도 실행 환경마다 달라지는 로컬 파일이므로 버전 관리 대상에서 제외합니다.

## 참고 사항

- PostgreSQL 데이터베이스가 먼저 생성되어 있어야 `migrate`가 정상 실행됩니다.
- 신규 환경에서는 `seed_shelves`, `seed_rbti_types` 명령을 실행해야 기본 책장과 RBTI 유형 데이터가 생성됩니다.
- 리뷰 분석 기능은 AI 모델 파일이 없으면 실행 중 `FileNotFoundError`가 발생할 수 있습니다.
- 외부 도서 검색 기능은 Kakao REST API 키가 설정되어 있어야 사용할 수 있습니다.
