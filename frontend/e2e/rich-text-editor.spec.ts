import { expect, test } from '@playwright/test'

test('TinyMCE tự host, tiếng Việt, chế độ, định dạng và HTML an toàn', async ({ page }) => {
  await page.goto('/e2e/fixtures/rich-text-editor.html')
  const frame = page.frameLocator('#tinymce-e2e_ifr')
  const body = frame.locator('body')
  await expect(body).toBeVisible()
  await expect(page.getByRole('button', { name: 'In đậm' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Chèn/sửa liên kết' })).toBeVisible()

  await body.fill('Lý do từ chối')
  await page.getByRole('button', { name: 'Chuyển chế độ' }).click()
  await expect(page.getByRole('button', { name: 'Chèn/sửa liên kết' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Bảng' })).toBeVisible()

  await page.evaluate(() => {
    const editor = (window as typeof window & { tinymce: { get: (id: string) => { setContent: (html: string) => void; getContent: () => string } } }).tinymce.get('tinymce-e2e')
    editor.setContent('<h2>Thông báo</h2><p><strong>Nội dung đậm</strong> <a href="https://ptit.edu.vn">Liên kết</a></p><table><tbody><tr><td>Ô bảng</td></tr></tbody></table><script>alert(1)</script><img src="data:image/png;base64,AAAA">')
  })
  await expect(body.locator('h2')).toHaveText('Thông báo')
  await expect(body.locator('strong')).toHaveText('Nội dung đậm')
  await expect(body.locator('a[href="https://ptit.edu.vn"]')).toHaveText('Liên kết')
  await expect(body.locator('table td')).toHaveText('Ô bảng')
  await expect(body.locator('script, img')).toHaveCount(0)
  await expect(page.getByTestId('saved-html')).toContainText('Nội dung đậm')

  await page.getByRole('button', { name: 'Đổi giao diện' }).click()
  await expect(page.locator('.tox-tinymce')).toBeVisible()
  await page.getByRole('button', { name: 'Đổi chỉ đọc' }).click()
  await expect(frame.locator('body')).toHaveAttribute('contenteditable', 'false')
})
