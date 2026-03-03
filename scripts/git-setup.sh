#!/bin/bash

# 1. 환경 설정
UPSTREAM_URL="https://github.com/FoliumTea/FoliumOnline.git"
# 실행 시 인자로 프라이빗 저장소 URL을 받거나, 없으면 질문합니다.
if [ -n "$1" ]; then
    PRIVATE_ORIGIN_URL=$1
else
    echo "🔗 새 프라이빗 저장소(Private Origin)의 URL을 입력하세요:"
    read PRIVATE_ORIGIN_URL
fi

echo "🚀 [설정 시작] 프라이빗 저장소 및 업스트림 환경 구성을 시작합니다."

# 2. 리모트 설정
echo "📡 리모트 저장소 설정 중..."

# 기존 origin이 있다면 삭제 (깨끗한 설정을 위해)
if git remote | grep -q "origin"; then
    git remote remove origin
fi
git remote add origin "$PRIVATE_ORIGIN_URL"

# upstream 설정
if git remote | grep -q "upstream"; then
    git remote remove upstream
fi
git remote add upstream "$UPSTREAM_URL"

# 3. 데이터 가져오기 및 브랜치 정렬
echo "📥 Upstream으로부터 데이터를 가져옵니다..."
git fetch upstream

# main 브랜치 설정 (upstream의 main을 기반으로 로컬 main 생성/연결)
echo "📂 main 브랜치 설정 중..."
git checkout -B main upstream/main

# develop 브랜치 설정 (upstream의 develop을 기반으로 로컬 develop 생성/연결)
echo "📂 develop 브랜치 설정 중..."
git checkout -B develop upstream/develop

# 4. 새 프라이빗 저장소(Origin)로 푸시
echo "📤 새 프라이빗 저장소($PRIVATE_ORIGIN_URL)로 초기 데이터를 푸시합니다..."
git push -u origin main
git push -u origin develop --force

echo "✨ [완료] 모든 설정이 끝났습니다."
echo "--------------------------------------------------"
echo "현재 리모트 상태:"
git remote -v
echo "--------------------------------------------------"
echo "이제 sync-upstream.sh와 push-origin.sh를 사용하여 작업을 관리하세요."