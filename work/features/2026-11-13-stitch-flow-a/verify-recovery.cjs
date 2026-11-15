const { chromium, request } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const http = await request.newContext({ baseURL: "http://127.0.0.1:8009" });
  const admin = (
    await (
      await http.post("/api/auth/login", {
        data: { email: "admin@vcsa.local", password: "demo123" },
      })
    ).json()
  ).data;
  const email = "recovery-" + Date.now() + "@example.test";
  await http.post("/api/admin/users", {
    headers: { Authorization: "Bearer " + admin.token },
    data: {
      email,
      display_name: "Recovery Test",
      roles: ["sales_rep"],
      password: "original-test-123",
    },
  });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    page.setDefaultTimeout(10000);
    await page.goto("http://127.0.0.1:5174/pilot.html");
    await page.getByRole("button", { name: "Comenzar", exact: true }).click();
    await page
      .getByRole("heading", { name: "Conoce a tu coach.", exact: true })
      .waitFor();
    await page.screenshot({
      path: __dirname + "/intro-desktop.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await page.getByRole("radio", { name: /AI Sales Coach/ }).click();
    await page.screenshot({
      path: __dirname + "/selector-desktop.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "Continuar al módulo" }).click();
    await page.getByLabel("Tu mensaje").fill("How can I practice discovery?");
    await page.getByRole("button", { name: "Enviar mensaje" }).click();
    await page.locator(".message.assistant").waitFor();
    await page.goBack();
    await page
      .getByRole("heading", {
        name: "¿Por dónde prefieres empezar?",
        exact: true,
      })
      .waitFor();
    await page.getByRole("radio", { name: /Bóveda de Recursos/ }).click();
    await page.getByRole("button", { name: "Continuar al módulo" }).click();
    await page.getByRole("link", { name: /Smart Notebook|Notebook/ }).click();
    await page.getByRole("button", { name: "Acceder para continuar" }).click();
    await page.getByLabel("Correo electrónico").fill(email);
    await page
      .getByRole("button", { name: "¿Olvidaste tu contraseña?" })
      .click();
    await page.getByRole("button", { name: "Solicitar recuperación" }).click();
    await page
      .getByRole("heading", { name: "Solicitud recibida.", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Usar enlace local de recuperación" })
      .click();
    await page
      .getByLabel("Contraseña", { exact: true })
      .fill("new-test-password");
    await page
      .getByLabel("Confirmar contraseña", { exact: true })
      .fill("mismatched-password");
    await page.getByRole("button", { name: "Guardar contraseña" }).click();
    await page
      .getByText("Las contraseñas no coinciden.", { exact: true })
      .waitFor();
    await page
      .getByLabel("Confirmar contraseña", { exact: true })
      .fill("new-test-password");
    await page.getByRole("button", { name: "Guardar contraseña" }).click();
    await page
      .getByRole("heading", { name: "Bienvenido de nuevo.", exact: true })
      .waitFor();
    await page
      .getByLabel("Contraseña", { exact: true })
      .fill("new-test-password");
    await page
      .getByRole("button", { name: "Iniciar sesión", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Notebook", exact: true })
      .waitFor();
    assert.equal(new URL(page.url()).hash, "#notebook");
    console.log(
      "PASS: guest public coach, browser back, private gate and password reset with confirmation; destination preserved",
    );
  } finally {
    await browser.close();
    await http.dispose();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
