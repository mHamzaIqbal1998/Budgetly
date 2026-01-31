import { ExpensesByExpenseAccount } from "@/types";
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
