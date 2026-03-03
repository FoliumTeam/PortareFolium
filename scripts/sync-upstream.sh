#!/bin/bash

# 설정
MAIN_BRANCH="main"
UPSTREAM_REMOTE="upstream"

echo "🔄 [Upstream 동기화] $UPSTREAM_REMOTE(FoliumOnline)의 최신 main을 가져옵니다."

# 1. main 브랜치로 전환
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "$MAIN_BRANCH" ]; then
    echo "📂 $MAIN_BRANCH 브랜치로 전환 중..."
    git switch $MAIN_BRANCH
fi

# 2. upstream 최신화
echo "📡 $UPSTREAM_REMOTE 로부터 최신 데이터 가져오는 중..."
git fetch $UPSTREAM_REMOTE

# 3. 업데이트 반영 (Fast-forward 불가능 시 일반 Merge 수행)
echo "📥 $MAIN_BRANCH 업데이트 반영 중..."
# --ff-only 대신 일반 merge를 사용하되, 메시지를 자동 생성합니다.
git merge $UPSTREAM_REMOTE/$MAIN_BRANCH --no-edit

if [ $? -eq 0 ]; then
    # 4. 내 프라이빗 저장소(origin)의 main도 최신화
    echo "🚀 원격 프라이빗 저장소(origin) main 업데이트 중..."
    git push origin $MAIN_BRANCH
    echo "✨ [완료] 로컬 및 원격(origin)의 main 브랜치가 Upstream과 동기화되었습니다."
else
    echo "❌ [오류] 병합 중 충돌이 발생했습니다. 수동으로 충돌을 해결해 주세요."
    exit 1
fi