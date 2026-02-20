import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests', // 테스트 파일들이 위치할 폴더
  fullyParallel: true,
  reporter: 'html', // 테스트 결과 리포트
  
  use: {
    // ⭐ 핵심: 관전 모드 (true면 브라우저가 안 뜹니다)
    headless: false, 
    
    // ⭐ 핵심: 사람 눈으로 볼 수 있게 1초씩 천천히 동작
    launchOptions: {
      slowMo: 1000, 
    },

    trace: 'on-first-retry',
    baseURL: 'http://localhost:3000', // Next.js 서버 주소
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});