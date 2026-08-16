# 07. 로컬 DB 콘텐츠 변경

## 적용 범위

- 대상: 현재 Windows 호스트의 `PortareFolium` 로컬 Git 작업 트리와 해당 작업 트리에서 직접 실행한 개발 서버
- 제외: production·preview·원격 배포 URL, CI, Cloud 작업 환경, 다른 저장소·작업 트리, 브라우저 관리자 UI 인증 우회
- 전제: 현재 작업 경로가 `git rev-parse --show-toplevel` 결과와 일치, `.env.local`이 Git 추적 제외, 필요한 환경 변수 존재
- 필수 환경 변수: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY`
- 환경 변수 값·원문 Bearer·해시 외 식별 정보의 터미널 출력, 로그 기록, 소스·문서·커밋 포함 금지

## 권한 경계

- `.env.local`의 서버 권한 키는 로컬 개발용 고권한 비밀. 이 파일을 보유한 실행 환경만 변경 절차 사용 가능
- 이 절차는 새로운 인증 우회 경로 생성 금지. 기존 MCP Bearer 검증을 단기 로컬 요청에만 사용
- 콘텐츠 테이블 직접 insert·update·delete 금지. 서버 권한 클라이언트 사용 범위는 일회용 `ai_agent_tokens` 발급·폐기만 허용
- 원격 URL, `0.0.0.0`, LAN 주소, 터널 URL을 MCP endpoint로 사용 금지. `http://127.0.0.1:<local-port>/api/mcp`만 허용
- 유효 환경 파일 부재·Git 추적 상태·로컬 endpoint·개발 서버 상태 중 하나라도 확인 불가 시 DB 변경 중단

## 표준 절차

1. 변경 전 `git rev-parse --show-toplevel`, `.env.local` Git 제외 상태, 로컬 개발 서버 endpoint 확인
2. 환경 변수의 존재만 비노출 방식으로 확인. 값 출력·복사·기록 금지
3. 10분 이하 만료 시간과 무작위 32바이트 이상 원문으로 일회용 Bearer 생성. DB에는 SHA-256 해시만 저장
4. `try/finally`로 토큰 행 식별자 보관. 성공·실패·중단과 관계없이 `finally`에서 해당 행 삭제. 삭제 실패 시 즉시 revoke 후 실패 사실 보고
5. 로컬 MCP endpoint에 `tools/list` 호출 후 필요한 도구 존재 확인. 콘텐츠 조회는 `get_*` 또는 `list_*`부터 실행
6. 콘텐츠 변경은 `create_*`, `update_*`, `update_resume` 같은 MCP 도구 호출만 사용. 완전한 대상 식별자와 최소 patch 사용
7. 저장 뒤 같은 MCP 읽기 도구로 저장값 재조회. 공개 경로에서 화면·브라우저 오류 확인
8. 공개 캐시 대상 변경 시 해당 MCP handler의 `revalidatePath`·`revalidateTag` 적용 확인. 미구현 handler는 직접 DB 변경으로 우회 금지; 먼저 최소 코드 보강과 검증 수행
9. 토큰 폐기 완료, 원문 비노출, 변경 대상·검증 결과만 기록한 뒤 종료

## 금지 항목

- `.env.local` 또는 Bearer 값을 채팅·로그·파일·클립보드·HTTP 요청 URL에 기록
- 장기 토큰, 재사용 토큰, 10분 초과 만료 시간, 토큰 목록 조회
- production 또는 외부 URL에 대한 직접 DB 변경
- 콘텐츠 테이블을 Supabase 클라이언트·SQL로 직접 변경하거나, MCP 인증·발행 검증·캐시 무효화 절차 생략
- 다른 사용자의 로컬 환경, 공유 작업 공간, 원격 에이전트 실행 환경에서 이 절차 적용

## 검증 기준

- 토큰은 현재 로컬 요청 중에만 존재, 종료 시 삭제 또는 revoke
- MCP 응답과 저장 후 재조회 결과 일치
- 해당 공개 로컬 경로의 콘텐츠·캐시 갱신 결과와 브라우저 오류 0건 확인
- `.env.local` 추적 제외 유지, 비밀값과 원문 Bearer의 Git diff·작업 문서·터미널 출력 부재
