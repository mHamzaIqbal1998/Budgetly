import { ExpensesByExpenseAccount, InsightTotalEntry } from "@/types";
import type { AxiosInstance } from "axios";

export async function getExpensesByExpenseAccount(
  api: AxiosInstance,
  start: string,
  end: string
): Promise<ExpensesByExpenseAccount[]> {
  const response = await api.get<ExpensesByExpenseAccount[]>(
    "insight/expense/expense",
    {
      params: { start, end },
    }
  );
  return response.data;
}

export async function getInsightIncomeTotal(
  api: AxiosInstance,
  start: string,
  end: string
): Promise<InsightTotalEntry[]> {
  const response = await api.get<InsightTotalEntry[]>("insight/income/total", {
    params: { start, end },
  });
  return response.data;
}

export async function getInsightExpenseTotal(
  api: AxiosInstance,
  start: string,
  end: string
): Promise<InsightTotalEntry[]> {
  const response = await api.get<InsightTotalEntry[]>("insight/expense/total", {
    params: { start, end },
  });
  return response.data;
}
