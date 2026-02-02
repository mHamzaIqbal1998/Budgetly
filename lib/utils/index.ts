/** Format date as YYYY-MM-DD in local time (avoids UTC shift from toISOString). */
function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const getStartEndDate = (days: number) => {
  const today = new Date();
  const endDate = today.toISOString().slice(0, 10);
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - days); // last x days including today
  const startDateString = startDate.toISOString().slice(0, 10);

  return { startDateString, endDate };
};

/** First day of current month to today (YYYY-MM-DD). Use for monthly budget spent range. */
export const getCurrentMonthStartEndDate = () => {
  const today = new Date();
  const endDate = toLocalDateString(today);
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const startDateString = toLocalDateString(startDate);
  return { startDateString, endDate };
};

export {
  createBudgetByIdMap,
  getBudgetInfoFromMap,
  type BudgetInfo,
} from "./budget-limits";
