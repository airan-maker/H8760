# Railway 배포 가이드

## 1. 사전 준비

- [Railway](https://railway.app) 계정 생성
- GitHub에 이 저장소 push

## 2. Railway 프로젝트 생성

1. Railway 대시보드에서 **New Project** 클릭
2. **Deploy from GitHub repo** 선택
3. 이 저장소 선택

## 3. 데이터베이스 추가

프로젝트 내에서:

1. **+ New** → **Database** → **Add PostgreSQL** 클릭
2. **+ New** → **Database** → **Add Redis** 클릭

## 4. Backend 서비스 설정

1. **+ New** → **GitHub Repo** → 같은 저장소 선택
2. 서비스 설정에서:
   - **Settings** → **Root Directory**: `backend`
   - **Variables** 탭에서 환경 변수 추가:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
CORS_ORIGINS=["https://your-frontend.up.railway.app"]
ANTHROPIC_API_KEY=your_api_key_here
SECRET_KEY=your_secret_key_here
```

> `${{Postgres.DATABASE_URL}}`는 Railway 변수 참조 문법입니다.

## 5. Frontend 서비스 설정

1. **+ New** → **GitHub Repo** → 같은 저장소 선택
2. 서비스 설정에서:
   - **Settings** → **Root Directory**: `frontend`
   - **Variables** 탭에서 환경 변수 추가:

```
VITE_API_URL=https://your-backend.up.railway.app
```

## 6. 도메인 설정

각 서비스의 **Settings** → **Networking** → **Generate Domain** 클릭

## 7. 배포 순서

Railway는 자동으로 배포하지만, 순서가 중요합니다:

1. PostgreSQL, Redis가 먼저 실행
2. Backend 배포 (DB 연결 확인)
3. Frontend 배포 (Backend URL 설정 후)

## 환경 변수 요약

### Backend
| 변수 | 설명 |
|------|------|
| `DATABASE_URL` | PostgreSQL 연결 URL (Railway 자동 제공) |
| `REDIS_URL` | Redis 연결 URL (Railway 자동 제공) |
| `CORS_ORIGINS` | 허용할 프론트엔드 도메인 |
| `ANTHROPIC_API_KEY` | Claude API 키 |
| `SECRET_KEY` | JWT 시크릿 키 |

### Frontend
| 변수 | 설명 |
|------|------|
| `VITE_API_URL` | Backend API URL |

## 트러블슈팅

### 빌드 실패 시
- Railway 로그에서 에러 확인
- Root Directory가 올바르게 설정되었는지 확인

### DB 연결 실패 시
- `DATABASE_URL` 변수가 PostgreSQL 서비스를 참조하는지 확인
- Backend가 DB보다 먼저 시작되면 재시작 필요

### CORS 에러 시
- Backend의 `CORS_ORIGINS`에 Frontend 도메인이 포함되어 있는지 확인
- `https://` 프로토콜 포함 필수
