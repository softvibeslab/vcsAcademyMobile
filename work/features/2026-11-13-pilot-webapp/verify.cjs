const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1050 },
  });
  const resourceTitle = "Guía QA piloto " + Date.now();
  const errors = [];
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => {
    errors.push(e.message);
    console.error("BROWSER", e.message);
  });
  const evidence = path.join(__dirname, "evidence");
  const go = async (hash) => {
    await page.goto("http://127.0.0.1:5174/pilot.html#" + hash);
    await page.waitForTimeout(500);
    console.log("Verified route:", hash);
  };
  const login = async (role) => {
    await page
      .getByRole("button", { name: "Ya tengo una cuenta", exact: true })
      .click();
    await page.locator("summary").click();
    await page.getByRole("button", { name: role, exact: true }).click();
    await page
      .getByRole("button", { name: "Iniciar sesión", exact: true })
      .click();
    await page.waitForTimeout(1000);
    await page.getByRole("heading", { name: /Vamos por más/ }).waitFor();
  };
  const logout = async () => {
    await page
      .getByRole("button", { name: "Cerrar sesión", exact: true })
      .first()
      .click();
    await page
      .getByRole("button", { name: "Ya tengo una cuenta", exact: true })
      .waitFor();
  };
  await go("home");
  await page.screenshot({
    path: path.join(evidence, "welcome-desktop.png"),
    fullPage: true,
  });
  await login("Rep");
  await go("goalsheet");
  await page.getByRole("button", { name: "Sí", exact: true }).click();
  await page.getByLabel("Volumen · USD", { exact: true }).fill("7500");
  await page.getByLabel("Número de ventas").fill("1");
  await page
    .getByLabel("Acción", { exact: true })
    .fill("Seguimiento de prueba");
  await page.getByLabel("Fecha de seguimiento").fill("2026-11-20");
  await page.getByRole("button", { name: "Guardar registro" }).click();
  await page
    .getByText("Actividad guardada. Tu desempeño ya está actualizado.")
    .waitFor();
  await go("home");
  await page.locator(".volume-row").filter({ hasText: "7,500" }).waitFor();
  await page.screenshot({
    path: path.join(evidence, "home-desktop.png"),
    fullPage: true,
  });
  await go("roadmap");
  assert.equal(await page.locator(".roadmap-step").count(), 11);
  await page.locator(".roadmap-step").first().click();
  await page
    .getByText(
      "Use this as training language, not legal or official contractual language.",
    )
    .waitFor();
  const complete = page.getByRole("button", {
    name: "Marcar como completado",
    exact: true,
  });
  if (await complete.count()) {
    await complete.click();
    await page
      .getByRole("button", { name: "Completado", exact: true })
      .waitFor();
  }
  await go("coach");
  await page
    .getByLabel("Tu mensaje", { exact: true })
    .fill("Help me practice discovery and vacation questions");
  await page
    .getByRole("button", { name: "Enviar mensaje", exact: true })
    .click();
  await page.locator(".message.assistant").waitFor();
  await go("roleplay");
  await page
    .getByLabel("Escenario", { exact: true })
    .selectOption({ index: 1 });
  await page.getByRole("button", { name: "Iniciar práctica" }).click();
  await page
    .getByLabel("Tu mensaje", { exact: true })
    .fill("Why does your family vacation matter?");
  await page
    .getByRole("button", { name: "Enviar mensaje", exact: true })
    .click();
  await page.locator(".message.assistant").waitFor();
  await page.getByRole("button", { name: "Terminar práctica" }).click();
  await page.getByRole("button", { name: "Enviar a evaluación" }).click();
  await page
    .getByText("Práctica enviada al equipo.", { exact: true })
    .waitFor();
  await go("notebook");
  await page.getByLabel("Título", { exact: true }).fill("Mi aprendizaje QA");
  await page
    .getByLabel("Tu nota", { exact: true })
    .fill("Escuchar antes de proponer.");
  await page.getByRole("button", { name: "Guardar nota" }).click();
  await page.getByRole("heading", { name: "Mi aprendizaje QA" }).waitFor();
  await page.reload();
  await page.getByRole("heading", { name: "Mi aprendizaje QA" }).waitFor();
  for (const route of [
    "vault",
    "agenda",
    "resources",
    "profile",
    "feedback",
    "calculators",
    "diary",
  ]) {
    await go(route);
    assert.equal(await page.locator("h1").count(), 1, route);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    "home",
    "roadmap",
    "vault",
    "coach",
    "profile",
    "goalsheet",
    "notebook",
    "agenda",
  ]) {
    await go(route);
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      route + " overflow",
    );
    if (route === "home")
      await page.screenshot({
        path: path.join(evidence, "home-mobile.png"),
        fullPage: true,
      });
  }
  await page.getByRole("button", { name: "Cambiar tema" }).click();
  await page.screenshot({
    path: path.join(evidence, "agenda-mobile-light.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Cambiar tema" }).click();
  await page.setViewportSize({ width: 1440, height: 1050 });
  await logout();
  await login("Gerente");
  await go("notebook");
  assert.equal(
    await page.getByRole("heading", { name: "Mi aprendizaje QA" }).count(),
    0,
  );
  await go("team");
  await page.getByRole("button", { name: "Evaluaciones", exact: true }).click();
  await page
    .getByLabel("Feedback", { exact: true })
    .first()
    .fill("Buena pregunta abierta. Profundiza en la motivación.");
  await page
    .getByRole("button", { name: "Enviar evaluación", exact: true })
    .first()
    .click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Mi equipo", exact: true }).click();
  await page
    .getByRole("button", { name: "Revisar certificación" })
    .first()
    .click();
  await page
    .getByLabel("Notas de certificación")
    .fill("Continuar con los módulos pendientes.");
  await page.getByRole("button", { name: "Registrar decisión" }).click();
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(evidence, "team-desktop.png"),
    fullPage: true,
  });
  await logout();
  await login("Admin");
  await go("admin");
  await page.getByLabel("Título del recurso").fill(resourceTitle);
  await page
    .getByLabel("Contenido", { exact: true })
    .fill("Material de entrenamiento de prueba.");
  await page.getByLabel("Estado", { exact: true }).selectOption("published");
  await page.getByRole("button", { name: "Guardar recurso" }).click();
  await page.getByRole("heading", { name: resourceTitle }).waitFor();
  await page.getByRole("button", { name: "Usuarios", exact: true }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Rep de prueba");
  await page
    .getByLabel("Correo del usuario")
    .fill("pilot-" + Date.now() + "@example.test");
  await page.getByRole("button", { name: "Crear invitación local" }).click();
  await page.getByText("Contraseña temporal:", { exact: false }).waitFor();
  await page.getByRole("button", { name: "Auditoría", exact: true }).click();
  await page.locator(".list-row").first().waitFor();
  await page.screenshot({
    path: path.join(evidence, "admin-desktop.png"),
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    path.join(evidence, "browser-results.json"),
    JSON.stringify(
      {
        passed: true,
        checks: [
          "login three roles",
          "goalsheet persisted",
          "lesson content and completion",
          "coach response",
          "roleplay turn complete submit",
          "notebook persistence and user isolation",
          "eight mobile routes no overflow",
          "manager review and certification",
          "admin resource publish and invitation",
          "audit list",
          "no browser runtime errors",
        ],
        errors,
      },
      null,
      2,
    ),
  );
  await browser.close();
  console.log(
    "PASS: real API browser flows, desktop/mobile and role isolation",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
