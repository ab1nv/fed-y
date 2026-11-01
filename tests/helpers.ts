import { expect, type Page } from "@playwright/test";

export async function login(page: Page, username: string, password = "password123") {
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(dashboard|driver)/);
}

export async function expectPath(page: Page, path: RegExp) {
  await expect(page).toHaveURL(path);
}
