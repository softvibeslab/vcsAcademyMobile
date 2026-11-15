// Genera doc/qa/e2e-dashboard/index.html con el inventario de artefactos de Playwright,
// el estado de la última ejecución y una copia del reporte HTML.
// Uso: node tools/qa/build-e2e-dashboard.mjs   (o npm run qa:e2e:dashboard)
import { cp, mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, 'doc', 'qa', 'e2e-dashboard');

const ARTIFACTS = [
  {
    group: 'Configuración',
    path: 'playwright.config.js',
    kind: 'creado',
    title: 'Configuración de Playwright',
    description:
      'Define testDir ./e2e, baseURL http://127.0.0.1:5173 (sobreescribible con E2E_BASE_URL), tres proyectos (Chromium, Firefox, WebKit), reintentos y un worker en CI, trazas en el primer reintento, capturas solo en fallo y el webServer que arranca npm run dev:web.',
  },
  {
    group: 'Tests',
    path: 'e2e/example.spec.js',
    kind: 'creado',
    title: 'Smoke tests de la pantalla de login',
    description:
      'Dos pruebas contra la vista sin sesión: título "WL Sales Academy" y visibilidad del encabezado y del botón "Sign in". No requieren el backend FastAPI.',
  },
  {
    group: 'Tests',
    path: 'e2e/fixtures/index.js',
    kind: 'creado',
    title: 'Fixtures compartidos',
    description:
      'Punto de extensión de test/expect. Incluye un ejemplo comentado de fixture authenticatedPage que inicia sesión con las credenciales demo.',
  },
  {
    group: 'Tests',
    path: 'e2e/pages/.gitkeep',
    kind: 'creado',
    title: 'Carpeta para Page Objects',
    description: 'Reservada para modelos de página (POM). Vacía por ahora.',
  },
  {
    group: 'Tests',
    path: 'e2e/test-data/.gitkeep',
    kind: 'creado',
    title: 'Carpeta para datos de prueba',
    description: 'Reservada para fixtures de datos (JSON, CSV). Vacía por ahora.',
  },
  {
    group: 'CI',
    path: '.github/workflows/playwright.yml',
    kind: 'creado',
    title: 'Workflow de GitHub Actions',
    description:
      'Corre en push a main y en pull requests. Node 22 con caché npm, npm ci, instala navegadores con dependencias del sistema, ejecuta npx playwright test y sube playwright-report como artefacto durante 30 días.',
  },
  {
    group: 'Proyecto',
    path: 'package.json',
    kind: 'modificado',
    title: 'Scripts y dependencias',
    description:
      'Se añadió @playwright/test ^1.63.0, se alineó playwright a ^1.63.0 y se agregaron los scripts test:e2e, test:e2e:ui, test:e2e:debug, qa:e2e:dashboard y qa:e2e:dashboard:serve.',
  },
  {
    group: 'Proyecto',
    path: 'package-lock.json',
    kind: 'modificado',
    title: 'Lockfile regenerado',
    description: 'Actualizado al instalar @playwright/test y las dependencias del monorepo (no existía node_modules).',
  },
  {
    group: 'Proyecto',
    path: '.gitignore',
    kind: 'modificado',
    title: 'Exclusiones de Playwright',
    description: 'Se ignoran test-results/, playwright-report/, blob-report/ y playwright/.cache/.',
  },
  {
    group: 'Salidas generadas',
    path: 'playwright-report/index.html',
    kind: 'generado',
    title: 'Reporte HTML de la última ejecución',
    description: 'Reporte interactivo de Playwright. Se copia dentro de este dashboard en ./playwright-report/.',
    link: './playwright-report/index.html',
  },
  {
    group: 'Salidas generadas',
    path: 'test-results/.last-run.json',
    kind: 'generado',
    title: 'Resumen de la última ejecución',
    description: 'Estado global y lista de tests fallidos. Es la fuente del semáforo de este dashboard.',
  },
  {
    group: 'Dashboard',
    path: 'tools/qa/build-e2e-dashboard.mjs',
    kind: 'creado',
    title: 'Generador de este dashboard',
    description: 'Lee el inventario, el estado de la última ejecución y copia el reporte. Se ejecuta con npm run qa:e2e:dashboard.',
  },
  {
    group: 'Dashboard',
    path: 'doc/qa/e2e-dashboard/index.html',
    kind: 'generado',
    title: 'Esta página',
    description: 'Salida estática del generador. Se sirve en local con npm run qa:e2e:dashboard:serve.',
  },
];

const slug = (rel) => rel.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();

const viewerPage = (rel, content) => `<!doctype html>
<html lang="es"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(rel)} · E2E Dashboard</title>
<style>
  :root { color-scheme: light dark; --bg:#0f1115; --card:#181b22; --line:#2a2f3a; --fg:#e6e8ee; --muted:#9aa3b2; --accent:#7aa2ff; }
  @media (prefers-color-scheme: light) { :root { --bg:#f6f7fb; --card:#fff; --line:#e3e6ee; --fg:#1b1f28; --muted:#5d6675; } }
  body { margin:0; font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif; background:var(--bg); color:var(--fg); }
  header { padding: 20px 32px; border-bottom:1px solid var(--line); display:flex; gap:16px; align-items:baseline; flex-wrap:wrap; }
  header a { color:var(--accent); text-decoration:none; }
  header code { font: 14px ui-monospace, SFMono-Regular, Menlo, monospace; }
  .meta { color:var(--muted); font-size:13px; }
  pre { margin:0; padding:24px 32px; font: 13px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; overflow:auto; white-space:pre; counter-reset: line; }
  pre span.l { display:block; }
  pre span.l::before { counter-increment: line; content: counter(line); display:inline-block; width:3.5em; margin-right:16px; text-align:right; color:var(--muted); user-select:none; }
</style></head>
<body>
<header><a href="../index.html">← Dashboard</a><code>${esc(rel)}</code><span class="meta">${content.split('\n').length} líneas · ${Buffer.byteLength(content)} bytes</span></header>
<pre>${content.length ? content.split('\n').map((l) => `<span class="l">${esc(l)}</span>`).join('') : '<span class="l">(archivo vacío)</span>'}</pre>
</body></html>
`;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function readJson(p, fallback) {
  try { return JSON.parse(await readFile(p, 'utf8')); } catch { return fallback; }
}

const SELF = path.relative(root, path.join(outDir, 'index.html'));

async function fileInfo(rel) {
  if (rel === SELF) return { exists: true, size: null, mtime: new Date() };
  const abs = path.join(root, rel);
  if (!existsSync(abs)) return { exists: false, size: 0, mtime: null };
  const s = await stat(abs);
  return { exists: true, size: s.size, mtime: s.mtime };
}

const lastRun = await readJson(path.join(root, 'test-results', '.last-run.json'), null);
const pkg = await readJson(path.join(root, 'package.json'), {});
const pwVersion = pkg.devDependencies?.['@playwright/test'] || '?';

const specSource = await readFile(path.join(root, 'e2e', 'example.spec.js'), 'utf8').catch(() => '');
const testCount = (specSource.match(/^\s*test\(/gm) || []).length;
const projectCount = 3;

await mkdir(path.join(outDir, 'files'), { recursive: true });
const rows = [];
for (const a of ARTIFACTS) {
  const info = await fileInfo(a.path);
  let view = a.link || null;
  if (!view && a.path === SELF) view = './index.html';
  if (!view && info.exists) {
    const content = await readFile(path.join(root, a.path), 'utf8');
    const name = `${slug(a.path)}.html`;
    await writeFile(path.join(outDir, 'files', name), viewerPage(a.path, content), 'utf8');
    view = `./files/${name}`;
  }
  rows.push({ ...a, info, view });
}

const groups = [...new Set(rows.map((r) => r.group))];
const status = lastRun?.status || 'sin ejecutar';
const failed = lastRun?.failedTests?.length ?? 0;
const statusClass = status === 'passed' ? 'ok' : status === 'failed' ? 'bad' : 'warn';
const generatedAt = new Date();

const fmtSize = (n) => (n === null ? 'esta ejecución' : n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(2)} MB`);
const fmtDate = (d) => (d ? new Date(d).toLocaleString('es-MX', { hour12: false }) : '—');

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>E2E Dashboard · VCSA Academy</title>
<style>
  :root { color-scheme: light dark; --bg:#0f1115; --card:#181b22; --line:#2a2f3a; --fg:#e6e8ee; --muted:#9aa3b2; --ok:#2ecc71; --bad:#ff5c5c; --warn:#f5b23e; --accent:#7aa2ff; }
  @media (prefers-color-scheme: light) { :root { --bg:#f6f7fb; --card:#fff; --line:#e3e6ee; --fg:#1b1f28; --muted:#5d6675; } }
  * { box-sizing: border-box; }
  body { margin:0; font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif; background:var(--bg); color:var(--fg); }
  header { padding: 32px 40px 16px; border-bottom:1px solid var(--line); }
  h1 { margin:0 0 4px; font-size: 24px; }
  h2 { margin: 32px 0 12px; font-size: 16px; text-transform: uppercase; letter-spacing:.08em; color:var(--muted); }
  main { padding: 8px 40px 48px; max-width: 1200px; }
  .sub { color:var(--muted); margin:0; }
  .tiles { display:grid; grid-template-columns: repeat(auto-fit, minmax(180px,1fr)); gap:12px; margin-top:20px; }
  .tile { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:14px 16px; }
  .tile .label { font-size:12px; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; }
  .tile .value { font-size:26px; font-weight:600; margin-top:2px; }
  .dot { display:inline-block; width:10px; height:10px; border-radius:50%; margin-right:8px; vertical-align:middle; }
  .ok { background:var(--ok);} .bad { background:var(--bad);} .warn { background:var(--warn);}
  table { width:100%; border-collapse: collapse; background:var(--card); border:1px solid var(--line); border-radius:10px; overflow:hidden; }
  th, td { text-align:left; padding:10px 12px; border-bottom:1px solid var(--line); vertical-align:top; }
  th { font-size:12px; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; }
  tr:last-child td { border-bottom:0; }
  code { font: 13px ui-monospace, SFMono-Regular, Menlo, monospace; background:rgba(127,127,127,.12); padding:1px 5px; border-radius:4px; }
  .badge { display:inline-block; font-size:11px; padding:2px 8px; border-radius:999px; border:1px solid var(--line); color:var(--muted); white-space:nowrap; }
  .badge.creado { color:var(--ok); border-color:var(--ok); }
  .badge.modificado { color:var(--warn); border-color:var(--warn); }
  .badge.generado { color:var(--accent); border-color:var(--accent); }
  .missing { color:var(--bad); }
  details { margin-top:6px; }
  summary { cursor:pointer; color:var(--accent); font-size:13px; }
  pre { margin:8px 0 0; padding:12px; background:rgba(127,127,127,.1); border-radius:8px; overflow:auto; font-size:12.5px; line-height:1.45; max-height:420px; }
  a { color:var(--accent); }
  a.view { white-space:nowrap; font-weight:600; text-decoration:none; }
  .cmds { display:grid; grid-template-columns: repeat(auto-fit, minmax(280px,1fr)); gap:10px; }
  .cmd { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:12px 14px; }
  .cmd code { display:block; margin-top:4px; padding:6px 8px; }
  footer { color:var(--muted); font-size:12px; padding: 0 40px 32px; }
</style>
</head>
<body>
<header>
  <h1>E2E Dashboard · VCSA Academy</h1>
  <p class="sub">Inventario de artefactos de Playwright, estado de la última ejecución y accesos rápidos. Generado ${esc(fmtDate(generatedAt))}.</p>
  <div class="tiles">
    <div class="tile"><div class="label">Última ejecución</div><div class="value"><span class="dot ${statusClass}"></span>${esc(status)}</div></div>
    <div class="tile"><div class="label">Tests fallidos</div><div class="value">${failed}</div></div>
    <div class="tile"><div class="label">Tests definidos</div><div class="value">${testCount} × ${projectCount} navegadores</div></div>
    <div class="tile"><div class="label">@playwright/test</div><div class="value">${esc(pwVersion)}</div></div>
    <div class="tile"><div class="label">Artefactos</div><div class="value">${rows.length}</div></div>
    <div class="tile"><div class="label">Reporte HTML</div><div class="value"><a href="./playwright-report/index.html">Abrir</a></div></div>
  </div>
</header>
<main>
${groups.map((g) => `
<h2>${esc(g)}</h2>
<table>
  <thead><tr><th style="width:26%">Artefacto</th><th>Descripción</th><th style="width:9%">Estado</th><th style="width:14%">Archivo</th><th style="width:8%">Ver</th></tr></thead>
  <tbody>
  ${rows.filter((r) => r.group === g).map((r) => `
    <tr>
      <td><strong>${esc(r.title)}</strong><br/><code>${esc(r.path)}</code></td>
      <td>${esc(r.description)}</td>
      <td><span class="badge ${esc(r.kind)}">${esc(r.kind)}</span></td>
      <td>${r.info.exists ? `${fmtSize(r.info.size)}<br/><span style="color:var(--muted);font-size:12px">${esc(fmtDate(r.info.mtime))}</span>` : '<span class="missing">no existe</span>'}</td>
      <td>${r.view ? `<a class="view" href="${esc(r.view)}"${r.link ? '' : ' target="_blank"'}>Abrir ↗</a>` : '<span class="missing">—</span>'}</td>
    </tr>`).join('')}
  </tbody>
</table>`).join('')}

<h2>Comandos</h2>
<div class="cmds">
  <div class="cmd">Ejecutar la suite en los tres navegadores<code>npm run test:e2e</code></div>
  <div class="cmd">Modo interactivo (UI mode)<code>npm run test:e2e:ui</code></div>
  <div class="cmd">Depurar con el inspector<code>npm run test:e2e:debug</code></div>
  <div class="cmd">Ver el reporte HTML nativo<code>npx playwright show-report</code></div>
  <div class="cmd">Regenerar este dashboard<code>npm run qa:e2e:dashboard</code></div>
  <div class="cmd">Servirlo en local (puerto 4174)<code>npm run qa:e2e:dashboard:serve</code></div>
</div>
</main>
<footer>Fuente de estado: <code>test-results/.last-run.json</code>. Regenera el dashboard después de cada ejecución para refrescar el semáforo y la copia del reporte.</footer>
</body>
</html>
`;

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, 'index.html'), html, 'utf8');
if (existsSync(path.join(root, 'playwright-report'))) {
  await cp(path.join(root, 'playwright-report'), path.join(outDir, 'playwright-report'), { recursive: true });
}
console.log(`Dashboard generado en ${path.relative(root, path.join(outDir, 'index.html'))} (${rows.length} artefactos, última ejecución: ${status})`);
