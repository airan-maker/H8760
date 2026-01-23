# Hydrogen Platform - 수소 전해조 최적화 플랫폼

수소 전해조 프로젝트의 경제성을 분석하고 최적화하는 시뮬레이션 플랫폼입니다.

## 주요 기능

### 1. 입력 모듈 (Input Configurator)
- **프리셋 선택**: 소규모 PEM, 대규모 ALK 등 사전 정의된 설비 구성
- **설비 사양**: 전해조 용량, 효율, 가동률, 스택 수명 설정
- **비용 구조**: CAPEX, OPEX, 전력 구매 방식 설정
- **시장 조건**: 수소 판매가, 전력 가격 시나리오
- **재무 조건**: 할인율, 부채 비율, 대출 조건
- **리스크 가중치**: 변동성 반영, 신뢰 수준 선택

### 2. 시뮬레이션 엔진 (Simulation Core)
- **8760 Engine**: 8760시간(1년) 단위 시간별 생산량 및 수익 계산
- **Monte Carlo Engine**: 불확실성을 반영한 확률적 분석
- **Financial Engine**: NPV, IRR, DSCR, LCOH 계산
- **Sensitivity Engine**: 민감도 분석 및 토네이도 차트

### 3. 결과 대시보드 (Result Dashboard)
- **KPI 카드**: NPV, IRR, DSCR, 연간 생산량, VaR, LCOH
- **수익 분포 히스토그램**: 몬테카를로 시뮬레이션 결과 분포
- **리스크 폭포수 차트**: NPV에 대한 리스크 요인별 영향
- **민감도 토네이도 차트**: 변수별 NPV 민감도
- **8760 히트맵**: 365일 x 24시간 가동 패턴
- **현금흐름 차트**: 연간 현금흐름 및 누적 현금흐름

## 기술 스택

### Backend
- **Framework**: FastAPI
- **Language**: Python 3.11+
- **Libraries**: NumPy, Pandas, Pydantic
- **Database**: PostgreSQL
- **Cache**: Redis

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **HTTP Client**: Axios
- **State Management**: Zustand

## 프로젝트 구조

```
Hydrogen/
├── backend/                      # FastAPI 백엔드
│   ├── app/
│   │   ├── main.py              # FastAPI 앱 진입점
│   │   ├── api/routes/          # API 라우트
│   │   ├── core/                # 설정 관리
│   │   ├── engine/              # 시뮬레이션 엔진
│   │   ├── models/              # DB 모델
│   │   └── schemas/             # Pydantic 스키마
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/                     # React 프론트엔드
│   ├── src/
│   │   ├── components/          # UI 컴포넌트
│   │   ├── pages/               # 페이지 컴포넌트
│   │   ├── services/            # API 클라이언트
│   │   ├── types/               # TypeScript 타입
│   │   └── utils/               # 유틸리티
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.yml           # Docker 설정
└── README.md
```

## 설치 및 실행

### Docker를 사용한 실행 (권장)

```bash
# 전체 스택 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 종료
docker-compose down
```

### 개별 실행

#### Backend
```bash
cd backend

# 가상환경 생성 및 활성화
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 서버 실행
uvicorn app.main:app --reload --port 8000
```

#### Frontend
```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

## API 엔드포인트

### Projects API
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/projects` | 새 프로젝트 생성 |
| GET | `/api/projects` | 프로젝트 목록 조회 |
| GET | `/api/projects/{id}` | 프로젝트 상세 조회 |
| PUT | `/api/projects/{id}` | 프로젝트 수정 |
| DELETE | `/api/projects/{id}` | 프로젝트 삭제 |

### Simulation API
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/simulation/run` | 시뮬레이션 실행 |
| GET | `/api/simulation/{id}/status` | 실행 상태 조회 |
| GET | `/api/simulation/{id}/result` | 결과 조회 |
| POST | `/api/simulation/compare` | 시나리오 비교 |

### Data API
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/data/presets` | 설비 프리셋 목록 |
| GET | `/api/data/tmy/{region}` | 지역별 기상 데이터 |
| GET | `/api/data/electricity-prices/{scenario}` | 전력 가격 데이터 |

## 접속 URL

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API 문서 (Swagger)**: http://localhost:8000/docs
- **API 문서 (ReDoc)**: http://localhost:8000/redoc

## 라이선스

MIT License
