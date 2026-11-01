import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test.describe.serial("dispatch operations", () => {
  let code = "";

  test("books a shipment through the UI", async ({ page }) => {
    await login(page, "priya");
    await page.goto("/dashboard/shipments/new");
    await page.locator('select[name="customerId"]').selectOption({ index: 1 });
    await page.locator('select[name="originId"]').selectOption({ index: 1 });
    await page.getByLabel("Destination address", { exact: true }).fill("E2E 42 Test Lane, Pune");
    await page.getByLabel("Destination city", { exact: true }).fill("Pune");
    await page.getByLabel("Weight (kg)", { exact: true }).fill("12.5");
    await page.getByRole("button", { name: "Create shipment" }).click();
    await page.waitForURL(/\/dashboard\/shipments\/(?!new$)[a-z0-9]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^FDY-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    code = (await page.getByRole("heading", { level: 1 }).textContent())?.trim() ?? "";
    expect(code).toMatch(/^FDY-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    await expect(page.getByText("Order accepted")).toBeVisible();
    await expect(page.getByText("Created", { exact: true }).first()).toBeVisible();
  });

  test("assigns a driver and walks the full state machine", async ({ page }) => {
    await login(page, "priya");
    await page.goto(`/dashboard/shipments?q=${code}`);
    await page.getByRole("link", { name: code }).click();
    await page.locator('select[name="driverId"]').selectOption({ index: 1 });
    await page.getByRole("button", { name: "Assign", exact: true }).click();
    await expect(page.getByRole("button", { name: "picked up" })).toBeVisible();

    await page.getByRole("button", { name: "picked up" }).click();
    await expect(page.getByRole("button", { name: "in transit" })).toBeVisible();

    await page.getByPlaceholder("Exception note (what went wrong?)").fill("E2E customer unavailable");
    await page.getByRole("button", { name: "Report exception" }).click();
    await expect(page.getByText("E2E customer unavailable")).toBeVisible();
    await expect(page.getByRole("button", { name: "in transit" })).toBeVisible();

    await page.getByRole("button", { name: "in transit" }).click();
    await expect(page.getByRole("button", { name: "out for delivery" })).toBeVisible();
    await page.getByRole("button", { name: "out for delivery" }).click();
    await expect(page.getByRole("button", { name: "delivered" })).toBeVisible();
    await page.getByRole("button", { name: "delivered" }).click();
    await expect(page.getByText("Delivered", { exact: true }).first()).toBeVisible();
  });

  test("public tracking and JSON agree with the database", async ({ page, request }) => {
    await page.goto(`/track/${code}`);
    await expect(page.getByRole("heading", { name: "Delivered" })).toBeVisible();
    await expect(page.getByText("E2E 42 Test Lane, Pune")).toBeVisible();

    const res = await request.get(`/api/track/${code}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.trackingCode).toBe(code);
    expect(body.status).toBe("DELIVERED");
    expect(body.events.at(-1).status).toBe("DELIVERED");
    expect(body.events.some((e: { note: string }) => e.note === "E2E customer unavailable")).toBe(true);

    const missing = await request.get("/api/track/ZZZZ-ZZZZ");
    expect(missing.status()).toBe(404);
  });

  test("tracking search form redirects to the parcel", async ({ page }) => {
    await page.goto("/track");
    await page.getByLabel("Tracking code").fill(code.toLowerCase());
    await page.getByRole("button", { name: "Track", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/track/${code}$`));
    await expect(page.getByText(code)).toBeVisible();
  });

  test("filters, search and pagination work over the seeded network", async ({ page }) => {
    await login(page, "priya");
    await page.goto(`/dashboard/shipments?q=${code}`);
    await expect(page.getByRole("link", { name: code })).toBeVisible();
    await expect(page.getByText("1 matching")).toBeVisible();

    await page.goto("/dashboard/shipments?status=EXCEPTION");
    await expect(page.getByText("Exception", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Delivered", { exact: true })).toHaveCount(0);

    await page.goto("/dashboard/shipments?page=2");
    await expect(page.getByText(/Page 2 of \d+/)).toBeVisible();

    await page.goto("/dashboard/shipments?q=Pune");
    await expect(page.getByRole("link", { name: code })).toBeVisible();
  });

  test("admin provisions and removes a team member", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/admin/team");
    const suffix = Date.now().toString(36);
    await page.getByLabel("Name", { exact: true }).fill("E2E Operator");
    await page.getByLabel("Username", { exact: true }).fill(`e2e_${suffix}`);
    await page.getByLabel("Email", { exact: true }).fill(`e2e_${suffix}@example.com`);
    await page.locator('select[name="role"]').selectOption("DISPATCHER");
    await page.getByLabel("Temp password", { exact: true }).fill("testpassword1");
    await page.getByRole("button", { name: "Add member" }).click();
    const username = `e2e_${suffix}`;
    await expect(page.getByRole("cell", { name: username, exact: true })).toBeVisible();

    page.on("dialog", (d) => d.accept());
    const row = page.getByRole("row").filter({ hasText: username });
    await row.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByRole("cell", { name: username, exact: true })).toHaveCount(0);
  });

  test("fleet accepts a vehicle and rejects a duplicate plate", async ({ page }) => {
    await login(page, "priya");
    await page.goto("/dashboard/fleet");
    const plate = `E2E${Date.now().toString(36).slice(-6).toUpperCase()}`;
    await page.getByLabel("Plate no.", { exact: true }).fill(plate);
    await page.locator('select[name="type"]').selectOption("Van");
    await page.getByLabel("Capacity (kg)", { exact: true }).fill("1400");
    await page.getByRole("button", { name: "Add vehicle" }).click();
    await expect(page.getByText(plate)).toBeVisible();

    await page.getByLabel("Plate no.", { exact: true }).fill(plate);
    await page.getByLabel("Capacity (kg)", { exact: true }).fill("1400");
    await page.getByRole("button", { name: "Add vehicle" }).click();
    await expect(page.getByText(/already exists/)).toBeVisible();
  });

  test("warehouses accept a new site and show low stock", async ({ page }) => {
    await login(page, "priya");
    await page.goto("/dashboard/warehouses");
    const code = `E2E${Date.now().toString(36).slice(-4).toUpperCase()}`;
    await page.getByLabel("Name", { exact: true }).fill("E2E Pune Hub");
    await page.getByLabel("Code", { exact: true }).fill(code);
    await page.getByLabel("Address", { exact: true }).fill("E2E Plot 9, Hinjewadi");
    await page.getByLabel("City", { exact: true }).fill("Pune");
    await page.locator('input[name="lat"]').fill("18.5913");
    await page.locator('input[name="lng"]').fill("73.7389");
    await page.getByRole("button", { name: "Add warehouse" }).click();
    await expect(page.getByText("E2E Pune Hub")).toBeVisible();
    await expect(page.getByText(/below reorder level|reorder ·/).first()).toBeVisible();
  });

  test("customers and overview render real aggregates", async ({ page }) => {
    await login(page, "priya");
    await page.goto("/dashboard");
    await expect(page.getByText("Active shipments")).toBeVisible();
    await expect(page.getByText("On-time rate")).toBeVisible();
    await expect(page.getByText("Live feed")).toBeVisible();
    await page.goto("/dashboard/customers");
    await expect(page.getByRole("heading", { name: "Customers" })).toBeVisible();
    await expect(page.getByRole("row").nth(1)).toContainText(/@/);
  });

  test("driver executes a stop, files an exception, and recovers", async ({ page, browser, request }) => {
    await login(page, "priya");
    await page.goto("/dashboard/shipments/new");
    await page.locator('select[name="customerId"]').selectOption({ index: 2 });
    await page.locator('select[name="originId"]').selectOption({ index: 2 });
    await page.getByLabel("Destination address", { exact: true }).fill("E2E 7 Driver Lane, Mumbai");
    await page.getByLabel("Destination city", { exact: true }).fill("Mumbai");
    await page.getByLabel("Weight (kg)", { exact: true }).fill("4.2");
    await page.getByRole("button", { name: "Create shipment" }).click();
    await page.waitForURL(/\/dashboard\/shipments\/(?!new$)[a-z0-9]+$/);
    const code = (await page.getByRole("heading", { level: 1 }).textContent())?.trim() ?? "";

    const raviValue = await page
      .locator('select[name="driverId"] option')
      .filter({ hasText: "Ravi Kumar" })
      .getAttribute("value");
    expect(raviValue).toBeTruthy();
    await page.locator('select[name="driverId"]').selectOption(raviValue!);
    await page.getByRole("button", { name: "Assign", exact: true }).click();
    await expect(page.getByRole("button", { name: "picked up" })).toBeVisible();

    const driverCtx = await browser.newContext();
    const driverPage = await driverCtx.newPage();
    await login(driverPage, "ravi");
    const card = driverPage.locator("div.rounded-xl").filter({ hasText: code }).first();
    await expect(card).toBeVisible();

    await card.getByRole("button", { name: "picked up" }).click();
    await expect(card.getByRole("button", { name: "Report issue" })).toBeVisible();
    await card.getByRole("button", { name: "Report issue" }).click();
    await expect(card.getByRole("button", { name: "Back on route" })).toBeVisible();
    await expect(card.getByText("Exception")).toBeVisible();
    await card.getByRole("button", { name: "Back on route" }).click();
    await expect(card.getByRole("button", { name: "out for delivery" })).toBeVisible();
    await card.getByRole("button", { name: "out for delivery" }).click();
    await expect(card.getByRole("button", { name: "delivered" })).toBeVisible();
    await card.getByRole("button", { name: "delivered" }).click();
    await expect(driverPage.getByText(code)).toHaveCount(0);

    const res = await request.get(`/api/track/${code}`);
    expect((await res.json()).status).toBe("DELIVERED");
    await driverCtx.close();
  });
});
