import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test.describe("customer portal", () => {
  test("customer signs in, sees own shipments, and opens the live map", async ({ page }) => {
    await login(page, "customer");
    await expect(page).toHaveURL(/\/my$/);
    await expect(page.getByRole("heading", { name: /Parcels for Ananya/ })).toBeVisible();
    await expect(page.getByText("Your shipments")).toBeVisible();
    await expect(page.getByText(/FDY-[A-Z0-9]{4}-[A-Z0-9]{4}/).first()).toBeVisible();

    await expect(page.locator(".leaflet-container")).toBeVisible({ timeout: 25_000 });
    await expect(page.locator("path.leaflet-interactive").first()).toBeVisible({ timeout: 25_000 });
    await expect(page.getByRole("heading", { name: "Live map" })).toBeVisible();

    await page.getByRole("link", { name: /Open live tracking/ }).first().click();
    await expect(page).toHaveURL(/\/track\/FDY-/);
  });

  test("customer cannot open staff areas", async ({ page }) => {
    await login(page, "customer");
    for (const path of ["/dashboard", "/dashboard/shipments", "/admin/team", "/driver"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/my$/);
    }
  });

  test("staff cannot open the customer portal", async ({ page }) => {
    await login(page, "priya");
    await page.goto("/my");
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
