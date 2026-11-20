/**
 * Private pilot v5: browser evidence using ONLY a disposable loopback database.
 * Run the fixture API separately and provide credentials via a private JSON file
 * or environment. No production defaults, API mocks, or public customer data.
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
const base = process.env.PILOT_QA_URL || "http://127.0.0.1:4197/pilot.html";
assert.ok(
  ["127.0.0.1", "localhost"].includes(new URL(base).hostname),
  "QA must target loopback",
);
const fixture = process.env.PILOT_QA_FIXTURE || "/tmp/aisales-pilot-v5-qa";
assert.ok(
  path.resolve(fixture).startsWith("/tmp/"),
  "Credentials must be in the disposable /tmp fixture",
);
const out =
  process.env.PILOT_QA_OUTPUT ||
  "work/features/2026-11-19-pilot-v5/evidence/browser";
await mkdir(out, { recursive: true });
const repRecord = JSON.parse(
  await readFile(path.join(fixture, "representative.json"), "utf8"),
);
const ownerRecord = JSON.parse(
  await readFile(path.join(fixture, "owner.json"), "utf8"),
);
const readCurrent = async (role) => {
  try {
    return JSON.parse(
      await readFile(path.join(fixture, role + "-current.json"), "utf8"),
    ).password;
  } catch {
    return null;
  }
};
const repPassword =
  process.env.PILOT_QA_REP_PASSWORD ||
  (await readCurrent("representative")) ||
  repRecord.temporary_password;
const ownerPassword =
  process.env.PILOT_QA_OWNER_PASSWORD ||
  (await readCurrent("owner")) ||
  ownerRecord.temporary_password;
// Explicitly disposable legacy fixture: mirrors backend legacy test schema.
// Synthetic summaries must remain separate from individual-tour metrics.
execFileSync("python3", [
  "-c",
  [
    "import sqlite3,json,sys,pathlib",
    "root=pathlib.Path(sys.argv[1]).resolve()",
    "assert root.is_relative_to(pathlib.Path('/tmp').resolve())",
    "record=json.loads((root/'representative.json').read_text())",
    "db=sqlite3.connect(root/'qa.sqlite')",
    "user=db.execute('SELECT id FROM users WHERE email=?',(record['email'],)).fetchone()[0]",
    "db.execute('CREATE TABLE IF NOT EXISTS goalsheet_entries(id TEXT PRIMARY KEY,user_id TEXT,entry_date TEXT,payload_json TEXT)')",
    "db.executemany('INSERT OR IGNORE INTO goalsheet_entries VALUES(?,?,?,?)',[(f'qa_legacy_{i:03}',user,'2026-10-01',json.dumps({'number_of_sales':2,'sales_volume':5600})) for i in range(101)])",
    "db.commit()",
  ].join("\n"),
  fixture,
]);
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_EXECUTABLE_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const reports = [],
  exceptions = [],
  secrets = [repPassword, ownerPassword];
const start = Date.now();
const run = async (name, fn) => {
  const before = Date.now();
  try {
    await fn();
    reports.push({ name, status: "passed", ms: Date.now() - before });
    console.log("PASS " + name);
  } catch (error) {
    reports.push({
      name,
      status: "failed",
      message: secrets.reduce(
        (m, v) => (v ? m.replaceAll(v, "[REDACTED]") : m),
        String(error.message),
      ),
    });
    throw error;
  }
};
const newContext = () =>
  browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    acceptDownloads: true,
  });
const repContext = await newContext(),
  ownerContext = await newContext();
const rep = await repContext.newPage(),
  owner = await ownerContext.newPage();
for (const page of [rep, owner]) {
  page.setDefaultTimeout(12000);
  page.on("pageerror", (e) => exceptions.push(e.message));
  page.on("dialog", (dialog) => dialog.accept());
}
const click = (p, name) => p.getByRole("button", { name, exact: true }).click();
const visible = (p, text) => p.getByText(text, { exact: true }).waitFor();
const nav = async (p, route) => {
  await p.evaluate((route) => {
    location.hash = route;
  }, route);
  await p.locator('main[data-route="' + route + '"]').waitFor();
  await p.waitForFunction(
    () => document.querySelectorAll("main .v-loading").length === 0,
  );
};
const shot = async (p, name) => {
  await p
    .locator("main h1")
    .first()
    .focus()
    .catch(() => {});
  await p.evaluate(() => scrollTo(0, 0));
  await p.screenshot({ path: path.join(out, name + ".png"), fullPage: true });
};
const get = async (p, url) => {
  const r = await p.request.get(new URL(url, base).href);
  assert.equal(r.status(), 200);
  return (await r.json()).data;
};
const waitMutation = (p, match, method, clicker) =>
  Promise.all([
    p
      .waitForResponse(
        (r) => r.url().includes(match) && r.request().method() === method,
      )
      .then(async (r) => {
        assert.ok(r.ok(), "Mutation " + match + " failed: " + r.status());
        return r.json();
      }),
    clicker(),
  ]).then(([r]) => r.data);
const login = async (p, record, password, role) => {
  await p.goto(base, { waitUntil: "domcontentloaded" });
  await p.getByRole("button", { name: "Sign in", exact: true }).waitFor();
  await click(p, "Sign in");
  await p.getByLabel("Email", { exact: true }).fill(record.email);
  await p.getByLabel("Password", { exact: true }).fill(password);
  await click(p, "Sign in");
  await p
    .locator("main, form")
    .filter({
      has: p.getByRole("heading", {
        name: /Set your personal password|Hello,|My roadmap/,
      }),
    })
    .first()
    .waitFor();
  if (
    await p
      .getByRole("heading", { name: "Set your personal password" })
      .isVisible()
  ) {
    const next = "Qa-" + randomBytes(18).toString("hex") + "!";
    secrets.push(next);
    await p.getByLabel("Temporary password", { exact: true }).fill(password);
    await p.getByLabel("New password", { exact: true }).fill(next);
    await p.getByLabel("Confirm new password", { exact: true }).fill(next);
    await click(p, "Save password");
    await p.locator("main").waitFor();
    await writeFile(
      path.join(fixture, role + "-current.json"),
      JSON.stringify({ password: next }),
      { mode: 0o600 },
    );
  }
  if (
    await p.getByRole("button", { name: "Skip guide", exact: true }).isVisible()
  )
    await click(p, "Skip guide");
  if (await p.getByRole("button", { name: "English", exact: true }).isVisible())
    await click(p, "English");
  await p.locator("main").waitFor();
};
let createdLesson, privateNote;
const followupText = "Synthetic follow-up " + Date.now();
try {
  await run("Access and representative navigation", async () => {
    await login(rep, repRecord, repPassword, "representative");
    assert.deepEqual(await rep.locator(".v-dock button").allTextContents(), [
      "Home",
      "Route",
      "Resources",
    ]);
    assert.equal(
      await rep.getByText(/AI Coach|Guest|Upgrade|Premium/).count(),
      0,
    );
    await shot(rep, "home-empty-mobile");
  });
  await run("Multiple tours preserve separate records", async () => {
    const prior = await get(rep, "/api/pilot/tours?limit=100");
    await nav(rep, "day");
    for (const item of [
      { type: "q", result: "no_sale" },
      { type: "nq", result: "sold", amount: "2000" },
    ]) {
      await click(rep, "Add tour");
      await rep
        .getByLabel("Tour type", { exact: true })
        .selectOption(item.type);
      await rep.getByLabel("Channel", { exact: true }).selectOption("agency");
      await rep.getByLabel("Result", { exact: true }).selectOption(item.result);
      if (item.amount)
        await rep
          .getByLabel("Net sales volume · USD", { exact: true })
          .fill(item.amount);
      await waitMutation(rep, "/api/pilot/tours", "POST", () =>
        click(rep, "Save tour"),
      );
      await rep.getByRole("dialog").waitFor({ state: "hidden" });
    }
    const after = await get(rep, "/api/pilot/tours?limit=100");
    assert.equal(after.items.length, prior.items.length + 2);
    assert.equal(
      new Set(after.items.map((x) => x.id)).size,
      after.items.length,
    );
    await shot(rep, "tours-mobile");
  });
  await run("Sold tour follow-up and completion", async () => {
    await rep
      .locator(".v-tour")
      .filter({ has: rep.getByText("USD 2,000.00", { exact: true }) })
      .first()
      .getByRole("button", { name: "Follow up", exact: true })
      .click();
    await rep
      .getByLabel("When · Cancún time", { exact: true })
      .fill("2026-11-25T14:30");
    await rep.getByLabel("Next action", { exact: true }).fill(followupText);
    await waitMutation(rep, "/followups", "POST", () =>
      click(rep, "Save follow-up"),
    );
    await nav(rep, "home");
    await visible(rep, followupText);
    await rep
      .locator(".v-followup")
      .filter({ hasText: followupText })
      .getByRole("button", { name: "Done", exact: true })
      .click();
    await rep
      .getByText(followupText, { exact: true })
      .waitFor({ state: "hidden" });
  });
  await run("Monthly goal confirmation and KPI cards", async () => {
    await nav(rep, "goals");
    const form = rep.getByLabel("Net volume budget · USD", { exact: true });
    if (await form.isVisible()) {
      await form.fill("6000");
      await rep
        .getByLabel("Closing target · % · Optional", { exact: true })
        .fill("50");
      await click(rep, "Review goal");
      await waitMutation(rep, "/monthly-goals", "POST", () =>
        click(rep, "Confirm monthly goal"),
      );
    }
    await rep
      .getByText(
        "Your goal is confirmed for this month and cannot be changed. Set a new goal when next month begins.",
        { exact: true },
      )
      .waitFor();
    await shot(rep, "monthly-goal-mobile");
    await nav(rep, "home");
    assert.equal(await rep.locator(".v-kpi").count(), 6);
    assert.equal(await rep.getByText(/NaN|Infinity/).count(), 0);
    await shot(rep, "home-mobile");
  });
  await run("Read-only legacy pagination is excluded from KPIs", async () => {
    const before = await get(rep, "/api/pilot/metrics?period=month");
    await nav(rep, "legacy");
    assert.equal(await rep.locator("main article.v-card").count(), 100);
    await click(rep, "Load more");
    await rep.waitForFunction(
      () => document.querySelectorAll("main article.v-card").length === 101,
    );
    assert.equal(
      await rep.getByRole("button", { name: "Load more", exact: true }).count(),
      0,
    );
    const after = await get(rep, "/api/pilot/metrics?period=month");
    assert.deepEqual(after.kpis, before.kpis);
  });
  await run("Notebook persists and offline save retains draft", async () => {
    await nav(rep, "notebook");
    await click(rep, "New note");
    privateNote = "Synthetic private note " + Date.now();
    await rep.getByLabel("Title", { exact: true }).fill(privateNote);
    await rep
      .getByLabel("Your note", { exact: true })
      .fill("Synthetic learning: ask one clear question.");
    await waitMutation(rep, "/api/pilot/notes", "POST", () =>
      click(rep, "Save entry"),
    );
    await visible(rep, "Saved to your account.");
    await rep
      .getByLabel("Your note", { exact: true })
      .fill("Synthetic offline draft must survive.");
    await repContext.setOffline(true);
    await click(rep, "Save entry");
    await rep
      .getByRole("alert")
      .filter({ hasText: "Your changes were not saved." })
      .waitFor();
    assert.equal(
      await rep.getByText("Saved to your account.", { exact: true }).count(),
      0,
    );
    assert.equal(
      await rep.getByLabel("Your note", { exact: true }).inputValue(),
      "Synthetic offline draft must survive.",
    );
    await shot(rep, "notebook-offline-mobile");
    await repContext.setOffline(false);
    await waitMutation(rep, "/api/pilot/notes/", "PATCH", () =>
      click(rep, "Save entry"),
    );
    await visible(rep, "Saved to your account.");
    await rep.reload();
    await rep.getByRole("heading", { name: privateNote, exact: true }).click();
    assert.equal(
      await rep.getByLabel("Your note", { exact: true }).inputValue(),
      "Synthetic offline draft must survive.",
    );
    await click(rep, "Close");
    await rep
      .getByLabel("Search your notes", { exact: true })
      .fill("nothing-matches-this-unique-query");
    await rep.getByText("Good ideas begin here.", { exact: true }).waitFor();
    await rep.getByLabel("Search your notes", { exact: true }).fill("");
    await rep
      .getByRole("heading", { name: privateNote, exact: true })
      .waitFor();
  });
  await run(
    "Journal stores all three answers and handles offline",
    async () => {
      await nav(rep, "diary");
      await click(rep, "New reflection");
      const fields = rep.locator("textarea");
      await fields.nth(0).fill("Synthetic: listened carefully.");
      await fields.nth(1).fill("Synthetic: clarify the next question.");
      await fields.nth(2).fill("Synthetic: summarize before moving on.");
      await repContext.setOffline(true);
      await click(rep, "Save entry");
      await rep.getByRole("alert").waitFor();
      assert.equal(
        await fields.nth(2).inputValue(),
        "Synthetic: summarize before moving on.",
      );
      await repContext.setOffline(false);
      await waitMutation(rep, "/api/pilot/diary", "POST", () =>
        click(rep, "Save entry"),
      );
      await visible(rep, "Saved to your account.");
      await shot(rep, "journal-mobile");
    },
  );
  await run("Calculators display approved reference results", async () => {
    await nav(rep, "calculators");
    await click(rep, "Calculate");
    await visible(rep, "USD 89,334.24");
    await rep
      .getByLabel("Assumed annual increase · %", { exact: true })
      .fill("0");
    await click(rep, "Calculate");
    await visible(rep, "USD 60,000.00");
    await rep
      .getByRole("button", { name: /Down payment & monthly payment/ })
      .click();
    await click(rep, "Calculate");
    await visible(rep, "USD 16,000.00");
    await visible(rep, "USD 421.34");
    await rep.getByLabel("Nominal annual rate · %", { exact: true }).fill("0");
    await click(rep, "Calculate");
    await visible(rep, "USD 333.33");
    await shot(rep, "calculators-mobile");
  });
  await run(
    "Language preference persists and account remains safe",
    async () => {
      await click(rep, "Español");
      await rep
        .getByRole("heading", { name: "Calculadoras", exact: true })
        .waitFor();
      await rep.reload();
      await rep
        .getByRole("heading", { name: "Calculadoras", exact: true })
        .waitFor();
      assert.equal(await rep.locator("html").getAttribute("lang"), "es");
      await rep.getByRole("button", { name: "Mi cuenta", exact: true }).click();
      await rep.getByRole("dialog").waitFor();
      await click(rep, "Ver guía de inicio");
      await rep.getByRole("dialog").waitFor();
      await click(rep, "Omitir guía");
      await click(rep, "English");
    },
  );
  await run(
    "Owner creates, previews, uploads and publishes lesson",
    async () => {
      await login(owner, ownerRecord, ownerPassword, "owner");
      assert.deepEqual(
        await owner.locator(".v-dock button").allTextContents(),
        ["My roadmap", "My team"],
      );
      await click(owner, "New lesson");
      const lessonTitle = "Synthetic practice " + Date.now();
      await owner
        .getByLabel("Lesson title · English", { exact: true })
        .fill(lessonTitle);
      await waitMutation(owner, "/api/pilot/owner/lessons", "POST", () =>
        click(owner, "Create draft"),
      );
      await owner
        .getByRole("heading", { name: "Lesson editor", exact: true })
        .waitFor();
      createdLesson = {
        id: await owner.evaluate(() => location.hash.split("/")[1]),
        title: lessonTitle,
      };
      await owner
        .getByLabel("Description · English", { exact: true })
        .fill(
          "Synthetic learning material. Review the introduction and discuss one next step.",
        );
      await owner
        .getByLabel("YouTube or Vimeo link", { exact: true })
        .fill("https://www.youtube.com/watch?v=jNQXAC9IVRw");
      await owner
        .getByLabel("Choose or replace PDF", { exact: true })
        .setInputFiles({
          name: "Guía de práctica.pdf",
          mimeType: "application/pdf",
          buffer: Buffer.from(
            "%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\n%%EOF\n",
          ),
        });
      await waitMutation(owner, "/draft", "PATCH", () =>
        click(owner, "Save draft"),
      );
      await visible(
        owner,
        "Draft saved. Your team still sees the last published version.",
      );
      await click(owner, "Preview");
      await owner.getByRole("dialog").waitFor();
      await click(owner, "Close");
      await waitMutation(owner, "/publish", "POST", () =>
        click(owner, "Approve & publish"),
      );
      await visible(
        owner,
        "You are viewing the published content. Save your edits to create a new draft.",
      );
      assert.equal(
        await owner.getByLabel("Title · English", { exact: true }).inputValue(),
        lessonTitle,
      );
      assert.equal(
        await owner
          .getByLabel("YouTube or Vimeo link", { exact: true })
          .inputValue(),
        "https://www.youtube.com/watch?v=jNQXAC9IVRw",
      );
      await nav(owner, "owner");
      await nav(owner, "editor/" + createdLesson.id);
      assert.equal(
        await owner.getByLabel("Title · English", { exact: true }).inputValue(),
        lessonTitle,
      );
      await owner
        .getByLabel("Description · English", { exact: true })
        .fill(
          "Synthetic revised learning material. Keep the published content while preparing the next version.",
        );
      await waitMutation(owner, "/draft", "PATCH", () =>
        click(owner, "Save draft"),
      );
      await waitMutation(owner, "/publish", "POST", () =>
        click(owner, "Approve & publish"),
      );
      await visible(
        owner,
        "You are viewing the published content. Save your edits to create a new draft.",
      );
      assert.equal(
        await owner.getByLabel("Title · English", { exact: true }).inputValue(),
        lessonTitle,
      );
      await shot(owner, "owner-editor-mobile");
      const content = await get(
        owner,
        "/api/pilot/owner/lessons/" + createdLesson.id + "/draft",
      );
      assert.equal(content.lesson.status, "published");
    },
  );
  await run(
    "Representative requests access and owner approves it",
    async () => {
      await nav(rep, "route");
      await rep
        .getByRole("button", {
          name: "Request access to " + createdLesson.title,
          exact: true,
        })
        .click();
      await waitMutation(rep, "/access-requests", "POST", () =>
        click(rep, "Send request"),
      );
      await rep
        .getByRole("button", {
          name: "Request access to " + createdLesson.title,
          exact: true,
        })
        .and(rep.locator(":disabled"))
        .waitFor();
      await shot(rep, "route-locked-mobile");
      await nav(owner, "requests");
      await owner
        .locator(".v-request")
        .filter({ hasText: createdLesson.title })
        .getByRole("button", { name: "Allow access", exact: true })
        .click();
      await owner
        .locator(".v-request")
        .filter({ hasText: createdLesson.title })
        .waitFor({ state: "hidden" });
      await rep.reload();
      await rep
        .getByRole("button", {
          name: "Open " + createdLesson.title,
          exact: true,
        })
        .click();
      await rep
        .getByRole("heading", { name: "Your lesson", exact: true })
        .waitFor();
      assert.ok(
        (await rep.locator("iframe").getAttribute("src")).startsWith(
          "https://www.youtube-nocookie.com/embed/",
        ),
      );
      const downloading = rep.waitForEvent("download");
      await click(rep, "Open script");
      const download = await downloading;
      assert.equal(download.suggestedFilename(), "Guía de práctica.pdf");
      await download.saveAs(path.join(out, "synthetic-script.pdf"));
      await waitMutation(rep, "/complete", "POST", () =>
        click(rep, "Lesson completed"),
      );
      assert.ok(
        await rep
          .getByRole("button", { name: "Completed", exact: true })
          .isDisabled(),
      );
      await shot(rep, "lesson-mobile");
    },
  );
  await run(
    "Owner personal permission overrides and team privacy",
    async () => {
      await nav(owner, "editor/" + createdLesson.id);
      await owner.getByText(/Personal exceptions/).click();
      const me = await get(rep, "/api/mobile/me");
      await owner
        .getByLabel("Representative", { exact: true })
        .selectOption(me.user.id);
      await owner
        .getByLabel("Permission", { exact: true })
        .selectOption("deny");
      await waitMutation(owner, "/access/" + me.user.id, "PUT", () =>
        click(owner, "Save permission"),
      );
      const denied = await rep.request.get(
        new URL("/api/pilot/lessons/" + createdLesson.id + "/pdf", base).href,
      );
      assert.equal(denied.status(), 403);
      await owner
        .getByLabel("Permission", { exact: true })
        .selectOption("allow");
      await waitMutation(owner, "/access/" + me.user.id, "PUT", () =>
        click(owner, "Save permission"),
      );
      await owner
        .getByLabel("Team access", { exact: true })
        .selectOption("open");
      await owner
        .getByLabel("Permission", { exact: true })
        .selectOption("inherit");
      await waitMutation(owner, "/access/" + me.user.id, "DELETE", () =>
        click(owner, "Save permission"),
      );
      await nav(owner, "team");
      await owner.locator(".v-team-card").first().waitFor();
      await shot(owner, "owner-team-mobile");
      assert.equal(
        await owner.getByText(privateNote, { exact: true }).count(),
        0,
      );
      await owner
        .locator(".v-team-card")
        .filter({ hasText: me.user.display_name })
        .click();
      await visible(owner, "Learning progress");
      assert.equal(
        await owner
          .getByText("Synthetic offline draft must survive.", { exact: true })
          .count(),
        0,
      );
    },
  );
  await run("Owner branding, ordering and archival", async () => {
    await nav(owner, "settings");
    await owner
      .getByLabel("Academy name", { exact: true })
      .fill("Synthetic Academy");
    await owner
      .getByLabel("Welcome title · English", { exact: true })
      .fill("Grow with a clear next step.");
    await owner
      .getByLabel("Welcome title · Spanish · Optional", { exact: true })
      .fill("Crece con un siguiente paso claro.");
    await waitMutation(owner, "/settings", "PATCH", () =>
      click(owner, "Save settings"),
    );
    await visible(owner, "Your academy settings are saved.");
    await nav(owner, "owner");
    await owner
      .getByRole("button", {
        name: "Move up: " + createdLesson.title,
        exact: true,
      })
      .click();
    await owner
      .locator(".v-owner-lesson")
      .filter({ hasText: createdLesson.title })
      .getByRole("button", { name: "Archive", exact: true })
      .click();
    await owner
      .locator(".v-owner-lesson")
      .filter({ hasText: createdLesson.title })
      .waitFor({ state: "hidden" });
    await click(owner, "Archived");
    await owner
      .locator(".v-owner-lesson")
      .filter({ hasText: createdLesson.title })
      .getByRole("button", { name: "Restore draft", exact: true })
      .click();
    await click(owner, "Active lessons");
    await owner
      .locator(".v-owner-lesson")
      .filter({ hasText: createdLesson.title })
      .getByText("Draft", { exact: true })
      .waitFor();
  });
  await run("Responsive widths, keyboard and reduced motion", async () => {
    for (const [p, role, routes] of [
      [
        rep,
        "representative",
        [
          "home",
          "day",
          "route",
          "resources",
          "notebook",
          "diary",
          "calculators",
        ],
      ],
      [
        owner,
        "owner",
        ["owner", "team", "settings", "editor/" + createdLesson.id],
      ],
    ]) {
      for (const width of [360, 390, 1440]) {
        await p.setViewportSize({ width, height: 900 });
        for (const route of routes) {
          await nav(p, route);
          await p.waitForFunction(
            () => document.querySelectorAll("main .v-loading").length === 0,
          );
          const dims = await p.evaluate(() => ({
            width: innerWidth,
            document: document.documentElement.scrollWidth,
          }));
          assert.ok(
            dims.document <= dims.width + 1,
            role + " " + route + " overflows at " + width,
          );
          if (
            width === 1440 &&
            ["home", "resources", "owner", "team"].includes(route)
          )
            await shot(p, role + "-" + route + "-desktop");
        }
      }
    }
    await rep.emulateMedia({ reducedMotion: "reduce" });
    await rep.setViewportSize({ width: 390, height: 844 });
    await nav(rep, "home");
    await rep.keyboard.press("Tab");
    assert.ok(
      await rep.evaluate(() => document.activeElement !== document.body),
    );
    await shot(rep, "home-final-mobile");
    assert.equal(
      exceptions.length,
      0,
      "No browser runtime exceptions expected",
    );
  });
  await run("Account dialog traps and restores keyboard focus", async () => {
    await nav(rep, "home");
    const trigger = rep.getByRole("button", {
      name: "My account",
      exact: true,
    });
    await trigger.click();
    await rep.getByRole("dialog").waitFor();
    for (let i = 0; i < 12; i++) {
      assert.ok(
        await rep.evaluate(() => !!document.activeElement?.closest("dialog")),
        "Focus stays inside modal",
      );
      await rep.keyboard.press("Tab");
    }
    await rep.keyboard.press("Escape");
    await rep.getByRole("dialog").waitFor({ state: "hidden" });
    assert.ok(
      await trigger.evaluate((node) => document.activeElement === node),
      "Focus returns to account control",
    );
  });
  await run("CSS layout at 200 percent (not browser zoom)", async () => {
    await rep.setViewportSize({ width: 1440, height: 1000 });
    await nav(rep, "home");
    await rep.evaluate(() => {
      document.documentElement.style.zoom = "2";
    });
    // documentElement.scrollWidth is already in visual CSS pixels with root zoom.
    const dims = await rep.evaluate(() => ({
      width: innerWidth,
      document: document.documentElement.scrollWidth,
    }));
    assert.ok(
      dims.document <= dims.width + 1,
      "Layout should not overflow at CSS 200%",
    );
    await shot(rep, "home-layout-200-percent");
    await rep.evaluate(() => {
      document.documentElement.style.zoom = "";
    });
  });
  await run("Sign out removes private access", async () => {
    await rep.getByRole("button", { name: "My account", exact: true }).click();
    await click(rep, "Sign out");
    await rep
      .getByRole("heading", {
        name: "Your next sale starts here.",
        exact: true,
      })
      .waitFor();
    assert.equal(
      (await rep.request.get(new URL("/api/pilot/notes", base).href)).status(),
      401,
    );
  });
} catch (error) {
  await Promise.allSettled([
    shot(rep, "failure-representative"),
    shot(owner, "failure-owner"),
  ]);
  console.error(
    "FAIL " +
      secrets.reduce(
        (m, v) => (v ? m.replaceAll(v, "[REDACTED]") : m),
        String(error.message),
      ),
  );
  process.exitCode = 1;
} finally {
  await writeFile(
    path.join(out, "results.json"),
    JSON.stringify(
      {
        base,
        fixture: "Synthetic loopback only",
        duration_ms: Date.now() - start,
        reports,
        browser_errors: exceptions,
      },
      null,
      2,
    ),
  );
  await browser.close();
}
