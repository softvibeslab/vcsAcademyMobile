const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const BASE = process.env.PILOT_TEST_URL || "http://127.0.0.1:5174/pilot.html";
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    page.setDefaultTimeout(8000);
    const errors = [],
      privateRequests = [];
    let guest = true;
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (
        guest &&
        r.url().includes("/api/") &&
        !/auth\/demo-users|smart-agent\/public-chat/.test(r.url())
      )
        privateRequests.push(r.url());
    });
    await page.goto(BASE);
    await page.getByRole("button", { name: "Comenzar", exact: true }).click();
    await page
      .getByRole("heading", { name: "Conoce a tu coach.", exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await page
      .getByRole("button", { name: "Representante de ventas", exact: true })
      .click();
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await page
      .getByRole("heading", {
        name: "¿Por dónde prefieres empezar?",
        exact: true,
      })
      .waitFor();
    for (const [label, heading] of [
      ["Roadmap Estructurado", "Tu camino a Top Producer."],
      ["AI Sales Coach", "Entrena para tu próxima conversación."],
      ["Bóveda de Recursos", "Todo para tu siguiente nivel."],
    ]) {
      await page.getByRole("radio", { name: new RegExp(label) }).click();
      assert.equal(
        await page
          .getByRole("button", { name: "Iniciar sesión", exact: true })
          .count(),
        0,
      );
      await page
        .getByRole("button", { name: "Continuar al módulo", exact: true })
        .click();
      await page.getByRole("heading", { name: heading, exact: true }).waitFor();
      assert.equal(
        await page.evaluate(() => localStorage.getItem("sa.pilot.session")),
        null,
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page
        .getByRole("button", { name: "Cambiar punto de inicio", exact: true })
        .click();
    }
    assert.deepEqual(privateRequests, []);
    await page.getByRole("radio", { name: /Roadmap Estructurado/ }).click();
    await page.getByRole("button", { name: "Continuar al módulo" }).click();
    await page
      .getByRole("button", { name: "Iniciar sesión", exact: true })
      .click();
    guest = false;
    await page.getByLabel("Correo electrónico").fill("rep@vcsa.local");
    await page.getByLabel("Contraseña", { exact: true }).fill("wrong");
    await page
      .getByRole("button", { name: "Iniciar sesión", exact: true })
      .click();
    await page.getByRole("alert").waitFor();
    await page
      .getByRole("button", { name: "¿Olvidaste tu contraseña?" })
      .click();
    assert.equal(await page.getByRole("alert").count(), 0);
    await page
      .getByRole("button", { name: "Volver al inicio de sesión", exact: true })
      .click();
    await page.getByLabel("Contraseña", { exact: true }).fill("demo123");
    await page
      .getByRole("button", { name: "Iniciar sesión", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Tu camino a Top Producer.", exact: true })
      .waitFor();
    assert.equal(new URL(page.url()).hash, "#roadmap");
    await page.goto(BASE + "#profile");
    await page
      .getByRole("button", { name: "Cerrar sesión", exact: true })
      .last()
      .click();
    await page.getByRole("button", { name: "Comenzar", exact: true }).waitFor();
    for (const [role, heading] of [
      ["Gerente o coach", "Haz crecer a tu equipo."],
      ["Dirección y administración", "Una academia para tu organización."],
    ]) {
      await page.getByRole("button", { name: "Comenzar", exact: true }).click();
      await page
        .getByRole("button", { name: "Continuar", exact: true })
        .click();
      await page.getByRole("button", { name: role, exact: true }).click();
      await page
        .getByRole("button", { name: "Continuar", exact: true })
        .click();
      await page.getByRole("heading", { name: heading, exact: true }).waitFor();
      await page.getByRole("button", { name: "Volver", exact: true }).click();
      await page.getByRole("button", { name: "Volver", exact: true }).click();
      await page.getByRole("button", { name: "Volver", exact: true }).click();
    }
    await page
      .getByRole("button", { name: "Ya tengo una cuenta", exact: true })
      .click();
    await page
      .getByRole("button", { name: "No tengo cuenta", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Tu cuenta de práctica", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Probar sin cuenta", exact: true })
      .click();
    await page.getByRole("radio", { name: /Bóveda de Recursos/ }).click();
    await page.getByRole("button", { name: "Continuar al módulo" }).click();
    await page.reload();
    await page.getByRole("button", { name: "Comenzar", exact: true }).waitFor();
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      __dirname + "/results.json",
      JSON.stringify(
        {
          passed: true,
          url: BASE,
          guestPrivateRequests: privateRequests,
          errors,
          checks: [
            "intro sequence",
            "three guest entry choices",
            "no implicit login",
            "destination after login",
            "errors reset on navigation",
            "manager/director branches",
            "invitation alternative",
            "guest refresh resets",
            "390px overflow",
          ],
        },
        null,
        2,
      ),
    );
    console.log(
      "PASS: Stitch A navigation, guest isolation, authentication and role branches",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
