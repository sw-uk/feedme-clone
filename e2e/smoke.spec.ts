import { expect, test } from "@playwright/test";

test("홈 화면이 열리고 변환 입력란이 보인다", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("URL → Markdown");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "URL → Markdown"
  );
  await expect(page.getByLabel("페이지 주소")).toBeVisible();
});
