import type {
  Budget,
  BudgetLimit,
  CreateBudgetData,
  FireflyApiResponse,
} from "@/types";
import type { AxiosInstance } from "axios";

export async function getBudgets(
  api: AxiosInstance,
  page: number = 1
): Promise<FireflyApiResponse<Budget[]>> {
  const response = await api.get<FireflyApiResponse<Budget[]>>("budgets", {
    params: { page },
  });
  return response.data;
}

export async function getBudget(
  api: AxiosInstance,
  id: string
): Promise<FireflyApiResponse<Budget>> {
  const response = await api.get<FireflyApiResponse<Budget>>(`budgets/${id}`);
  return response.data;
}

export async function createBudget(
  api: AxiosInstance,
  data: CreateBudgetData
): Promise<FireflyApiResponse<Budget>> {
  const response = await api.post<FireflyApiResponse<Budget>>("budgets", data);
  return response.data;
}

export async function updateBudget(
  api: AxiosInstance,
  id: string,
  data: Partial<CreateBudgetData>
): Promise<FireflyApiResponse<Budget>> {
  const response = await api.put<FireflyApiResponse<Budget>>(
    `budgets/${id}`,
    data
  );
  return response.data;
}

export async function deleteBudget(
  api: AxiosInstance,
  id: string
): Promise<void> {
  await api.delete(`budgets/${id}`);
}

export async function getBudgetLimits(
  api: AxiosInstance,
  id: string
): Promise<FireflyApiResponse<BudgetLimit[]>> {
  const response = await api.get<FireflyApiResponse<BudgetLimit[]>>(
    `budgets/${id}/limits`
  );
  return response.data;
}
