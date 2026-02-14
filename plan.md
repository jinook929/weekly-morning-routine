# Weekly Morning Alarm App - Implementation Plan

## Overview
로컬 음악 파일을 지정된 시간에 시스템 오디오로 재생하는 주간 알람 앱.
브라우저에서 스케줄 설정, Node.js 서버가 시스템 명령어로 음악 재생.

## Tech Stack
- **Backend**: Node.js + Express
- **Scheduling**: node-cron (cron 기반 스케줄링)
- **Audio Playback**: 시스템 명령어 (Mac: `afplay`, Windows: `powershell Start-Process`, Linux: `aplay`/`paplay`)
- **Frontend**: Vanilla HTML + CSS + JS (프레임워크 없이 심플하게)
- **Data Storage**: JSON 파일 (`data/settings.json`)

## Architecture

```
Browser (설정 UI)  <-->  Express Server (API + Static)  -->  System Audio
                              |
                         node-cron (스케줄러)
                              |
                        settings.json (설정 저장)
```

## Project Structure

```
weekly-morning-routine/
├── package.json
├── server.js                 # Express 서버 + cron 스케줄러
├── lib/
│   ├── scheduler.js          # node-cron 스케줄 관리
│   ├── player.js             # 크로스플랫폼 오디오 재생
│   └── settings.js           # 설정 파일 읽기/쓰기
├── public/
│   ├── index.html            # 메인 UI
│   ├── style.css             # 스타일
│   └── app.js                # 프론트엔드 로직
└── data/
    └── settings.json         # 스케줄 설정 데이터
```

## Data Model (settings.json)

```json
{
  "musicFilePath": "/path/to/music.mp3",
  "volume": 80,
  "schedule": {
    "sunday":    { "enabled": true,  "time": "06:00" },
    "monday":    { "enabled": true,  "time": "05:30" },
    "tuesday":   { "enabled": true,  "time": "05:30" },
    "wednesday": { "enabled": true,  "time": "05:30" },
    "thursday":  { "enabled": true,  "time": "05:30" },
    "friday":    { "enabled": true,  "time": "05:30" },
    "saturday":  { "enabled": false, "time": "07:00" }
  }
}
```

## API Endpoints

| Method | Endpoint          | Description           |
|--------|-------------------|-----------------------|
| GET    | /api/settings     | 현재 설정 조회          |
| PUT    | /api/settings     | 전체 설정 저장          |
| POST   | /api/test-play    | 음악 테스트 재생         |
| POST   | /api/stop         | 현재 재생 중지          |
| GET    | /api/status       | 서버/스케줄 상태 확인     |

## Implementation Steps

### Step 1: 프로젝트 초기화
- `package.json` 생성
- 의존성: `express`, `node-cron`
- npm install

### Step 2: Backend 핵심 모듈
- `lib/player.js`: OS 감지 → 적절한 시스템 명령어로 오디오 재생/중지
- `lib/settings.js`: JSON 파일 기반 설정 관리 (읽기/쓰기/기본값)
- `lib/scheduler.js`: node-cron으로 요일별 cron job 등록/갱신/해제

### Step 3: Express 서버
- `server.js`: API 라우트 + static 파일 서빙 + 서버 시작 시 스케줄 로드

### Step 4: Frontend UI
- 요일별 on/off 토글 + 시간 선택
- 음악 파일 경로 입력 (파일 브라우저 or 직접 입력)
- 볼륨 조절 슬라이더
- 테스트 재생/중지 버튼
- 서버 상태 표시
- 깔끔한 반응형 디자인

### Step 5: 통합 및 테스트
- 전체 플로우 테스트
- 에러 핸들링 확인

## Key Considerations
- **크로스플랫폼 오디오**: `process.platform`으로 OS 감지 후 적절한 명령어 사용
- **프로세스 관리**: 재생 중인 오디오 프로세스 추적하여 중지 가능하게
- **설정 변경 시 스케줄 갱신**: 설정 저장 시 기존 cron job 해제 후 재등록
- **서버 재시작 시 복원**: 서버 시작 시 settings.json에서 스케줄 자동 복원
