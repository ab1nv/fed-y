import { expect, test } from "@playwright/test";
import { login } from "./helpers";

const START = { latitude: 12.9352, longitude: 77.6245 };
const MOVE = { latitude: 12.9001, longitude: 77.6502 };
const DEMO = { latitude: 28.6139, longitude: 77.209 };

test.describe("live driver location", () => {
  test.describe("with browser permission", () => {
    test.use({ geolocation: START, permissions: ["geolocation"], locale: "en-IN" });

    test("tracks automatically and reaches dispatch, tracking, and the API", async ({ page, browser }) => {
      await login(page, "ravi");
      await expect(page).toHaveURL(/\/driver$/);

      const firstCode = (await page.locator("p.font-mono.text-brand").first().textContent())?.trim();
      expect(firstCode).toMatch(/^FDY-/);

      // No button press: the driver app asks for location on login.
      await expect(page.getByText(/Sharing ·/)).toBeVisible({ timeout: 25_000 });

      await expect
        .poll(
          async () => {
            const res = await page.request.get(`/api/track/${firstCode}`);
            const body = await res.json();
            return body.location;
          },
          { timeout: 25_000, intervals: [500, 1000, 2000] },
        )
        .toMatchObject({ lat: START.latitude, lng: START.longitude });

      // Move the "phone" and wait for the next throttled ping.
      await page.waitForTimeout(9_000);
      await page.context().setGeolocation(MOVE);

      await expect
        .poll(
          async () => {
            const res = await page.request.get(`/api/track/${firstCode}`);
            const body = await res.json();
            return body.location;
          },
          { timeout: 30_000, intervals: [1000, 2000, 3000] },
        )
        .toMatchObject({ lat: MOVE.latitude, lng: MOVE.longitude });

      await page.reload();
      await expect(page.getByText(/live pin 12\.9001, 77\.6502/).first()).toBeVisible();

      // Dispatcher instance sees the same coordinates.
      const dispatch = await browser.newContext();
      const dpage = await dispatch.newPage();
      await login(dpage, "priya");
      await dpage.goto(`/dashboard/shipments?q=${firstCode}`);
      await dpage.getByRole("link", { name: firstCode }).click();
      await expect(dpage.getByText("Live location")).toBeVisible();
      await expect(dpage.getByText(/12\.90010, 77\.65020/)).toBeVisible();
      await expect(dpage.getByRole("link", { name: /open map/ })).toHaveAttribute(
        "href",
        /openstreetmap\.org\/\?mlat=12\.9001/,
      );

      // Public customer instance sees the same coordinates.
      const publicPage = await dispatch.newPage();
      await publicPage.goto(`/track/${firstCode}`);
      await expect(publicPage.getByText("Live location")).toBeVisible();
      await expect(publicPage.getByText(/12\.9001, 77\.6502/)).toBeVisible();
      await dispatch.close();
    });
  });

  test.describe("without browser permission", () => {
    test.use({ permissions: [] });

    test("shows the required-location error and offers a demo position", async ({ page }) => {
      await login(page, "ravi");
      await expect(page.getByText(/Location is required/)).toBeVisible({ timeout: 20_000 });
      await expect(page.getByRole("button", { name: "Use demo location" })).toBeVisible();

      const firstCode = (await page.locator("p.font-mono.text-brand").first().textContent())?.trim();
      await page.getByRole("button", { name: "Use demo location" }).click();
      await expect(page.getByText("Demo location active")).toBeVisible();
      await expect(page.getByText(/Delhi/)).toBeVisible();

      await expect
        .poll(
          async () => {
            const res = await page.request.get(`/api/track/${firstCode}`);
            const body = await res.json();
            return body.location;
          },
          { timeout: 25_000, intervals: [500, 1000, 2000] },
        )
        .toMatchObject({ lat: DEMO.latitude, lng: DEMO.longitude });
    });
  });
});
