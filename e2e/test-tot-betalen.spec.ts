import { expect, test, type Page } from "@playwright/test";

// Fills in every question of a test like a visitor would: pick a gender, answer
// each page of five statements, go to the next page, and finish.
async function completeTest(page: Page, path: string) {
  await page.goto(path);
  await page.getByRole("button", { name: "Vrouw" }).click();
  for (let step = 0; step < 40; step++) {
    const groups = page.getByRole("radiogroup");
    await expect(groups.first()).toBeVisible();
    for (const group of await groups.all()) await group.getByRole("radio").nth(2).click();
    const finish = page.getByRole("button", { name: "Bekijk mijn resultaten" });
    if (await finish.isVisible()) return finish.click();
    await page.getByRole("button", { name: "Volgende" }).click();
  }
  throw new Error("test did not finish");
}

test("big five: test afmaken, resultaat zien, e-mailblok en naar de betaalpagina", async ({ page }) => {
  await completeTest(page, "/nl/big-five/start");
  await expect(page).toHaveURL(/\/nl\/big-five\/result$/);

  // The free email box.
  const optin = page.locator("form", { hasText: "Wil je je resultaat per mail?" });
  await expect(optin).toBeVisible();
  let signup: Record<string, unknown> | undefined;
  await page.route("**/api/subscribe", async (route) => {
    signup = route.request().postDataJSON();
    await route.fulfill({ json: { ok: true } });
  });
  await optin.getByRole("textbox").fill("lezer@example.com");
  await optin.getByRole("checkbox").check();
  await optin.getByRole("button", { name: "Mail mijn resultaat" }).click();
  await expect(page.getByText("Verstuurd!")).toBeVisible();
  expect(signup).toMatchObject({ slug: "big-five", locale: "nl", email: "lezer@example.com", consent: true, gender: "female" });
  expect(String(signup!.answers)).toMatch(/^\d{100}$/);

  // The buy button: without the terms box ticked it refuses, then goes to Stripe.
  let checkout: Record<string, unknown> | undefined;
  await page.route("**/api/checkout", async (route) => {
    checkout = route.request().postDataJSON();
    await route.fulfill({ json: { url: "https://checkout.stripe.com/c/pay/e2e" } });
  });
  await page.route("https://checkout.stripe.com/**", (route) => route.fulfill({ body: "<h1>Stripe Checkout</h1>", contentType: "text/html" }));
  const buy = page.getByRole("button", { name: /Ontvang mijn rapport voor/ });
  await expect(buy).toContainText("1,99");
  await buy.click();
  await expect(page.getByText("Accepteer de voorwaarden om verder te gaan.")).toBeVisible();
  expect(checkout).toBeUndefined();
  await page.getByRole("checkbox", { name: /Ik ga akkoord met de voorwaarden/ }).check();
  await buy.click();
  await expect(page.getByRole("heading", { name: "Stripe Checkout" })).toBeVisible();
  expect(checkout).toMatchObject({ slug: "big-five", locale: "nl", plan: "single", gender: "female" });
});

test("depressietest: resultaat werkt, maar zonder e-mailblok", async ({ page }) => {
  await completeTest(page, "/nl/depression/start");
  await expect(page).toHaveURL(/\/nl\/depression\/result$/);
  await expect(page.getByRole("button", { name: /Ontvang mijn rapport voor/ })).toBeVisible();
  await expect(page.getByText("Wil je je resultaat per mail?")).toHaveCount(0);
});
