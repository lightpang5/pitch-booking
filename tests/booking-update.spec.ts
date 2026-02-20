import { test, expect } from '@playwright/test';

// 🐌 여기를 설정하면 모든 동작(클릭, 입력 등) 사이에 1.5초씩 대기합니다.
test.use({

    viewport: { width: 1920, height: 1080 },

    // 3. 브라우저 실행 옵션
    launchOptions: {
        slowMo: 2500, // 1500ms = 1.5초 (원하는 만큼 늘리셔도 됩니다)
        headless: false, // 브라우저 창 띄우기 (필수)
    },
});

test('예약 시간 변경 E2E 테스트', async ({ page }) => {
    // 1. 대시보드로 이동 시도
    await page.goto('/dashboard');

    // 로그인 페이지로 리다이렉트 되었는지 확인
    if (page.url().includes('/login')) {
        console.log('🔒 로그인이 필요하여 로그인 절차를 진행합니다.');

        // 이메일 입력
        await page.getByPlaceholder('m@example.com').fill('mzfutsal@test.com');

        // 비밀번호 입력
        await page.getByLabel('Password').fill('123123');

        // 로그인 버튼 클릭
        await page.click('button[type="submit"]');

        // 로그인 후 페이지 이동 대기 (메인 or 대시보드)
        await page.waitForURL((url) => url.pathname === '/' || url.pathname === '/dashboard');

        // 만약 메인('/')으로 왔다면 대시보드로 이동
        if (new URL(page.url()).pathname === '/') {
            await page.goto('/dashboard');
        }
    }

    // 2. 대시보드 로딩 확인
    console.log('👀 대시보드 진입 확인 중...');
    await page.waitForURL('**/dashboard');

    // "시간 변경" 버튼이 뜰 때까지 기다린 후 클릭
    try {
        const editButton = page.locator('button:has-text("시간 변경 / 초대")').first();
        await editButton.waitFor({ state: 'visible', timeout: 5000 });
        await editButton.click();
    } catch (e) {
        throw new Error('❌ 수정할 예약 내역이 없습니다. 테스트 계정에 예약이 있는지 확인해주세요.');
    }

    // 다이얼로그 확인
    await expect(page.getByText('예약 변경', { exact: true })).toBeVisible();

    // 3. 스케줄러에서 새로운 시간 선택
    // 빈 슬롯(.bg-white) 중 첫 번째를 클릭
    const availableSlot = page.locator('.bg-white').first();
    await availableSlot.click();

    // 선택 확인
    await expect(page.getByText('선택된 일정')).toBeVisible();

    // 4. 변경 사항 저장
    const saveButton = page.getByRole('button', { name: '변경 사항 저장' });
    await saveButton.click();

    // 5. 성공 확인 (텍스트 수정됨 ✅)
    // 아까 실패한 원인: "예약이 변경되었습니다" (X) -> "성공적으로 수정되었습니다" (O)
    // 화면에 실제로 뜨는 텍스트 중 일부만 포함되면 통과하도록 수정했습니다.
    // ✅ 수정: 방금 코드에서 설정한 토스트 메시지의 정확한 텍스트만 타겟팅
    await expect(page.getByText('예약이 변경되었습니다!')).toBeVisible();

    // 6. 다이얼로그 닫힘 확인
    await expect(page.getByText('예약 변경', { exact: true })).not.toBeVisible();

    console.log('✅ 테스트 성공! 5초 뒤 종료합니다.');
    await page.waitForTimeout(5000);
});