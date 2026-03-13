import { test, expect } from "@playwright/test";

/**
 * E2E: critical order flow.
 * Menu → New order → Product with modifiers (1 Protein, 1 Topping) →
 * Submit order → 202 → Redirect to order detail → Timeline with ORDER_PLACED.
 *
 * Requires: API on port 3000 (pnpm dev:api), frontend on :5173 (Playwright starts it if needed), seeded menu (pnpm seed).
 */
test.describe("Order flow (critical path)", () => {
  test("menu → new order → Custom Bowl (protein + topping) → submit → order detail with ORDER_PLACED", async ({
    page,
  }) => {
    const baseURL = process.env.BASE_URL ?? "http://localhost:5173";

    // 1. Go to frontend and wait for menu API response
    const menuPromise = page.waitForResponse(
      (res) => res.url().includes("/api/v1/menu") && res.request().method() === "GET",
      { timeout: 20_000 }
    );
    await page.goto(baseURL);
    let menuRes;
    try {
      menuRes = await menuPromise;
    } catch {
      throw new Error(
        "Menu API did not respond in 20s. Start the API: pnpm infra:up && pnpm dev:api (and pnpm seed if needed)."
      );
    }
    if (!menuRes.ok()) {
      throw new Error(
        `Menu API returned ${menuRes.status()}. Ensure the API is running: pnpm dev:api.`
      );
    }

    // 2. Verify Menu page and at least one product with modifiers
    await expect(page.getByRole("heading", { name: "Menu" })).toBeVisible();
    await expect(page.getByRole("link", { name: "New order" })).toBeVisible();
    const productLabel = page
      .getByText("Custom Bowl")
      .or(page.getByText("Build Your Own Salad"))
      .first();
    await expect(productLabel).toBeVisible({ timeout: 10_000 });

    // 3. Go to Create Order
    await page.getByRole("link", { name: "New order" }).click();

    // 4. Create Order page and form
    await expect(page.getByRole("heading", { name: "Create Order" })).toBeVisible();
    await expect(page.getByTestId("create-order-form")).toBeVisible();

    // Custom Bowl card (seed: Protein required, Toppings, Sauces)
    const itemName = "Custom Bowl";
    const card = page
      .locator('[data-slot="card"]')
      .filter({ has: page.getByLabel(new RegExp(`Quantity for ${itemName}`, "i")) })
      .first();
    await expect(card).toBeVisible({ timeout: 10_000 });

    // Quantity 1
    await card.getByLabel(new RegExp(`Quantity for ${itemName}`, "i")).fill("1");
    // Required protein: Chicken
    await card.getByRole("radio", { name: /Chicken/i }).check();
    // Optional topping: Lettuce
    await card.getByRole("checkbox", { name: /Lettuce/i }).check();

    // 5. Add to order, then submit from summary
    await card.getByRole("button", { name: "Add to order" }).click();
    await expect(page.getByTestId("order-summary")).toBeVisible({ timeout: 5_000 });

    const postOrderPromise = page.waitForResponse(
      (res) => res.url().includes("/api/v1/orders") && res.request().method() === "POST",
      { timeout: 20_000 }
    );
    await page.getByTestId("submit-order-btn").click();

    const postRes = await postOrderPromise;
    if (!postRes.ok()) {
      const body = await postRes.text();
      throw new Error(`Order creation failed (${postRes.status()}): ${body.slice(0, 400)}`);
    }
    await expect(page).toHaveURL(/\/orders\/[a-f0-9-]+/i, { timeout: 15_000 });

    // 6. Order detail: wait for page to load (loading or header), then header
    await expect(
      page.getByTestId("order-detail-header").or(page.getByTestId("order-detail-loading"))
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("order-detail-header")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /Order\s+/ })).toBeVisible();
    const orderIdInUrl = page.url().split("/orders/")[1]?.split("/")[0] ?? "";
    expect(orderIdInUrl.length).toBeGreaterThan(0);

    // 7. Timeline shows "Order placed" event
    const timeline = page.getByTestId("order-timeline-events");
    await expect(timeline).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Order placed")).toBeVisible();
  });
});
