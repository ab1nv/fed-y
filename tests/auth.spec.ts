import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test.describe("auth and roles", () => {
  test("login page advertises every demo profile", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("region", { name: "Demo accounts" })).toBeVisible();
    for (const role of ["Admin", "Dispatcher", "Driver", "Customer"]) {
      await expect(page.getByRole("button", { name: new RegExp(role) })).toBeVisible();
    }
    await expect(page.getByText("password123").first()).toBeVisible();
  });

  test("clicking a demo profile fills the credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /Driver/ }).click();
    await expect(page.getByLabel("Username")).toHaveValue("ravi");
    await expect(page.getByLabel("Password")).toHaveValue("password123");
  });

  test("logged-out visitors are redirected and logged-in users skip the form", async ({ page }) => {
    for (const path of ["/dashboard", "/dashboard/shipments", "/admin/team", "/driver"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login\?next=/);
    }
    await login(page, "admin");
    await page.goto("/login");
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("dispatcher is blocked from admin and driver areas", async ({ page }) => {
    await login(page, "priya");
    await page.goto("/admin/team");
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto("/driver");
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("admin can open the team console", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/admin/team");
    await expect(page.getByRole("heading", { name: "Team & roles" })).toBeVisible();
  });

  test("driver lands in the mobile app and cannot reach dispatch", async ({ page }) => {
    await login(page, "ravi");
    await expect(page).toHaveURL(/\/driver$/);
    await expect(page.getByText(/open stops?/)).toBeVisible();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/driver$/);
  });

  test("dashboard defaults to dark and the toggle works", async ({ page }) => {
    await login(page, "admin");
    const html = page.locator("html");
    await expect(html).toHaveClass(/dark/);
    await page.getByRole("button", { name: "Toggle colour theme" }).click();
    await expect(html).toHaveClass(/light/);
    await page.getByRole("button", { name: "Toggle colour theme" }).click();
    await expect(html).toHaveClass(/dark/);
  });

  test("opens a driver account and logs out", async ({ page }) => {
    await page.goto("/signup");
    const suffix = Date.now().toString(36);
    await page.getByLabel("Full name").fill("E2E Driver");
    await page.getByLabel("Username").fill(`e2e_${suffix}`);
    await page.getByLabel("Email").fill(`e2e_${suffix}@example.com`);
    await page.getByLabel("I am a").selectOption("DRIVER");
    await page.getByLabel("Phone (drivers only)").fill("+91 90000 00000");
    await page.getByLabel("Password").fill("testpassword1");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL(/\/driver$/);
    await expect(page.getByText("All clear. No open assignments right now.")).toBeVisible();
    await page.getByRole("button", { name: "Exit" }).click();
    await page.waitForURL(/\/$/);
  });
});
