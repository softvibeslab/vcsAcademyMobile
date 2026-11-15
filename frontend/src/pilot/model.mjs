import {
  calculateGoalSheetMetrics,
  validateGoalSheetEntry,
} from "../../../packages/domain/src/index.mjs";
export const localDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export function periodEntries(entries, period, today = localDate()) {
  const date = new Date(today + "T12:00:00");
  let start = today;
  if (period === "month") start = today.slice(0, 7) + "-01";
  if (period === "week") {
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    start = localDate(date);
  }
  return entries.filter((e) => e.date >= start && e.date <= today);
}
export const metricsFor = (entries) =>
  calculateGoalSheetMetrics(
    entries.map((e) => ({
      tourOutcome: e.tour_outcome,
      salesVolume: e.sales_volume,
      numberOfSales: e.number_of_sales,
    })),
  );
export function goalPayload(form) {
  const sold = form.sales_outcome === "sold";
  const value = {
    date: form.date,
    tour_outcome: form.tour_outcome,
    sales_outcome: form.sales_outcome,
    sales_volume: sold ? Number(form.sales_volume) : 0,
    number_of_sales: sold ? Number(form.number_of_sales) : 0,
    manager_to_name: form.manager_to_name || null,
    no_sale_reason: sold ? null : form.no_sale_reason || null,
    notes: form.notes || "",
    follow_ups: form.follow_ups || [],
  };
  const errors = validateGoalSheetEntry({
    date: value.date,
    tourOutcome: value.tour_outcome,
    salesOutcome: value.sales_outcome,
    salesVolume: value.sales_volume,
    numberOfSales: value.number_of_sales,
  });
  if (!Number.isFinite(value.sales_volume) || errors.length)
    throw Error("Revisa la fecha, el volumen y la cantidad de ventas.");
  if (sold && value.number_of_sales < 1)
    throw Error("Indica al menos una venta.");
  return value;
}
export const canManage = (user) =>
  user?.roles?.some((r) =>
    ["manager", "trainer", "coach", "to_manager", "admin"].includes(r),
  ) || false;
export function noteKey(id) {
  if (!id) throw Error("Se requiere una cuenta para guardar notas.");
  return "sa.pilot.notes." + id;
}
export const money = (value) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "USD",
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
export const roleLabel = (user) =>
  user?.roles?.includes("admin")
    ? "Administrador"
    : canManage(user)
      ? "Gerente / Coach"
      : "Representante";
