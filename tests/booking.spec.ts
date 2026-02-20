import { test, expect } from '@playwright/test';

test('메인 페이지 접속 테스트', async ({ page }) => {
  // 1. 메인 페이지로 이동
  await page.goto('/');

  // 2. 타이틀 확인 (잘 떴는지)
  // (실제 프로젝트의 텍스트에 맞게 수정이 필요할 수 있습니다)
  await expect(page).toHaveURL('/');
  
  // 3. 잠시 대기 (눈으로 확인용)
  await page.waitForTimeout(3000);
});