const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const url = "http://127.0.0.1:5174/pilot.html";
  await page.goto(url);
  await page
    .getByRole("button", { name: "Conoce a tu coach", exact: true })
    .click();
  await page.getByLabel("Tu pregunta").fill("What is the academy?");
  await page.getByRole("button", { name: "Preguntar al coach" }).click();
  await page.locator(".notice").waitFor();
  await page.getByRole("button", { name: "Entrar a mi academia" }).click();
  await page.getByLabel("Correo electrónico").fill("rep@vcsa.local");
  await page.getByLabel("Contraseña", { exact: true }).fill("incorrect");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.getByRole("alert").waitFor();
  await page.getByLabel("Contraseña", { exact: true }).fill("demo123");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.getByRole("heading", { name: /Vamos por más/ }).waitFor();
  await page.goto(url + "#admin");
  await page
    .getByText("Tu cuenta no tiene acceso a administración.", { exact: true })
    .waitFor();
  await page.goto(url + "#resources");
  await page.locator(".tile").first().waitFor();
  const restricted = page
    .locator(".tile")
    .filter({ hasText: "ACCESO RESTRINGIDO" });
  if (await restricted.count()) {
    await restricted.first().click();
    await page.getByRole("alert").waitFor();
  }
  await page.goto(url + "#notebook");
  await page.getByLabel("Título", { exact: true }).fill("Temporal");
  await page.getByLabel("Tu nota").fill("Nota local desechable de QA");
  await page.getByRole("button", { name: "Guardar nota" }).click();
  await page.getByRole("heading", { name: "Temporal", exact: true }).waitFor();
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Eliminar", exact: true }).click();
  await page
    .getByRole("heading", { name: "Temporal", exact: true })
    .waitFor({ state: "hidden" });
  await page.route("**/api/blueprint/steps/step_2", (route) => route.abort());
  await page.goto(url + "#lesson/step_2");
  await page.getByRole("alert").waitFor();
  await page.unroute("**/api/blueprint/steps/step_2");
  await page.getByRole("button", { name: "Reintentar" }).click();
  await page.getByRole("heading", { name: "Agenda", exact: true }).waitFor();
  await page.evaluate(() =>
    localStorage.setItem("sa.pilot.session", "expired-session-test"),
  );
  await page.reload();
  await page.getByRole("button", { name: "Ya tengo una cuenta" }).waitFor();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("sa.pilot.session")),
    null,
  );
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    __dirname + "/evidence/edge-results.json",
    JSON.stringify(
      {
        passed: true,
        checks: [
          "public coach",
          "invalid login",
          "rep denied admin",
          "restricted resource denied",
          "local note deletion",
          "network failure and retry",
          "expired token cleared",
        ],
        errors,
      },
      null,
      2,
    ),
  );
  await browser.close();
  console.log(
    "PASS: error recovery, permissions, public coach, notes deletion and expired session",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
