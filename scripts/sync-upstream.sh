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

# 3. upstream/main의 내용을 로컬 main에 반영 (Fast-forward 권장)
echo "📥 $MAIN_BRANCH 업데이트 반영 중..."
git merge $UPSTREAM_REMOTE/$MAIN_BRANCH --ff-only

if [ $? -eq 0 ]; then
    # 4. 내 프라이빗 저장소(origin)의 main도 최신화
    echo "🚀 원격 프라이빗 저장소(origin) main 업데이트 중..."
    git push origin $MAIN_BRANCH
    echo "✨ [완료] 로컬 및 원격(origin)의 main 브랜치가 Upstream 과 동기화되었습니다."
else
    echo "❌ [오류] Fast-forward 병합이 불가능합니다. 로컬 main에 수동 커밋이 있는지 확인하세요."
    exit 1
fi