import { expect, test } from '@playwright/test'
test('dashboard navigation and not found route', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Tổng quan' })).toBeVisible()
  await page.getByRole('link', { name: 'Cài đặt' }).click()
  await expect(page.getByRole('heading', { name: 'Cài đặt' })).toBeVisible()
  await page.goto('/missing-page')
  await expect(page.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeVisible()
})
