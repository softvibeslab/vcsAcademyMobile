const valid = (value, min, max, integer = false) => {
  const n = Number(value);
  if (
    value === "" ||
    !Number.isFinite(n) ||
    n < min ||
    n > max ||
    (integer && !Number.isInteger(n))
  )
    throw new Error("invalid_number");
  return n;
};
const round = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
export function anywayMoney(amount, years, rate) {
  const a = valid(amount, 0.01, 10000000),
    n = valid(years, 1, 50, true),
    g = valid(rate, 0, 30) / 100;
  return round(g === 0 ? a * n : (a * Math.expm1(n * Math.log1p(g))) / g);
}
export function loanPayment(price, down, annual, months) {
  const p = valid(price, 0.01, 100000000),
    d = valid(down, 0, 100) / 100,
    r = valid(annual, 0, 100) / 1200,
    n = valid(months, 1, 600, true);
  const principal = p * (1 - d);
  return {
    principal: round(principal),
    monthly: round(
      r === 0
        ? principal / n
        : (principal * r) / -Math.expm1(-n * Math.log1p(r)),
    ),
  };
}
export function toCents(value) {
  const s = String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw new Error("invalid_money");
  const [a, b = ""] = s.split(".");
  const n = Number(a) * 100 + Number(b.padEnd(2, "0"));
  if (!Number.isSafeInteger(n)) throw new Error("invalid_money");
  return n;
}
export function tourPayload(form) {
  const noTour = form.tour_kind === "no_tour",
    sold = form.sale_status === "sold";
  return {
    occurred_on: form.occurred_on,
    tour_kind: form.tour_kind,
    channel: form.channel || null,
    sale_status: noTour ? null : form.sale_status || "no_sale",
    net_volume_cents: noTour || !sold ? 0 : toCents(form.amount),
  };
}
export function monthGoal(form) {
  const budget = toCents(form.amount);
  if (budget <= 0 || budget > 10000000000) throw new Error("invalid_money");
  return {
    month: form.month,
    budget_volume_cents: budget,
    target_close_bps:
      form.target === "" ? null : Math.round(valid(form.target, 0, 100) * 100),
  };
}
export const localDay = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Cancun",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
export const newKey = () => crypto.randomUUID();
export const routeForRole = (role, route) => {
  const shared = [
    "home",
    "day",
    "route",
    "lesson",
    "resources",
    "goals",
    "notebook",
    "diary",
    "calculators",
    "legacy",
  ];
  if (shared.includes(route)) return route;
  if (
    role === "owner" &&
    ["owner", "team", "editor", "requests", "settings"].includes(route)
  )
    return route;
  return role === "owner" ? "owner" : "home";
};
export const money = (cents, locale = "en") =>
  cents == null
    ? "—"
    : new Intl.NumberFormat(locale === "es" ? "es-MX" : "en-US", {
        style: "currency",
        currency: "USD",
        currencyDisplay: "code",
        minimumFractionDigits: 2,
      }).format(Number(cents) / 100);
export const amountMoney = (amount, locale = "en") =>
  money(Math.round(amount * 100), locale);
export const percent = (value, suffix = "%") =>
  value == null ? "—" : Number(value).toFixed(2) + suffix;
export const initialTour = () => ({
  occurred_on: localDay(),
  tour_kind: "q",
  channel: "agency",
  sale_status: "no_sale",
  amount: "",
});
export const safeVideo = (url) => {
  try {
    const u = new URL(url);
    return u.protocol === "https:" &&
      [
        "www.youtube.com",
        "youtube.com",
        "www.youtube-nocookie.com",
        "player.vimeo.com",
      ].includes(u.hostname)
      ? u.href
      : null;
  } catch {
    return null;
  }
};
export const accessVersion = (exceptions, userId) =>
  exceptions.find((item) => item.user_id === userId)?.version || 0;
export const editorDraft = (data) =>
  data.draft ||
  (data.published_revision ? { ...data.published_revision, id: null } : {});
