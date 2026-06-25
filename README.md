# 🐯 건강관리 기록 앱

## Vercel 배포 방법

### 1. GitHub에 올리기
```bash
git init
git add .
git commit -m "init"
# GitHub에서 새 레포 만들고 연결
git remote add origin https://github.com/YOUR_ID/health-tracker.git
git push -u origin main
```

### 2. Vercel 연결
1. vercel.com 접속
2. "New Project" → GitHub 레포 선택
3. Environment Variables에 추가:
   - `ANTHROPIC_API_KEY` = (Anthropic API 키)
4. Deploy!

### 3. 완료
배포 후 URL 북마크 → 매일 바로 접근 🎉

## Anthropic API 키 발급
https://console.anthropic.com/settings/keys
