#!/bin/bash

# 설정
MAIN_BRANCH="main"
DEVELOP_BRANCH="develop"

echo "🔄 [로컬 동기화 시작] GitHub의 최신 변경사항을 로컬에 반영합니다."

# 1. main 브랜치로 전환 (현재 브랜치가 main이 아닐 경우)
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "$MAIN_BRANCH" ]; then
    echo "📂 $MAIN_BRANCH 브랜치로 전환 중..."
    git switch $MAIN_BRANCH
fi

# 2. 원격(GitHub)의 최신 main 가져오기
echo "📡 $MAIN_BRANCH 브랜치 최신화 (git pull)..."
git pull origin $MAIN_BRANCH

# 3. develop 브랜치로 복귀 및 리베이스
echo "📂 $DEVELOP_BRANCH 브랜치로 복귀 중..."
git switch $DEVELOP_BRANCH

echo "🛠 $DEVELOP_BRANCH 리베이스 진행 (Author Date 유지)..."
# --committer-date-is-author-date를 통해 작성 날짜가 커밋 날짜가 되도록 함
git rebase $MAIN_BRANCH --committer-date-is-author-date

# 4. 원격 develop에 강제 푸시
if [ $? -eq 0 ]; then
    echo "🚀 $DEVELOP_BRANCH 원격 저장소에 강제 푸시 중..."
    git push origin $DEVELOP_BRANCH --force
    echo "✨ [완료] 로컬 및 원격 develop 브랜치가 모두 최신화되었습니다."
else
    echo "❌ [오류] 리베이스 중 충돌이 발생했습니다. 수동으로 해결해 주세요."
    exit 1
fi