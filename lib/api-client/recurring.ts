import type {
  AllBillsResponse,
  FireflyApiResponse,
  RecurringTransaction,
} from "@/types";
import type { AxiosInstance } from "axios";

export async function getRecurringTransactions(
  api: AxiosInstance,
  page: number = 1
): Promise<FireflyApiResponse<RecurringTransaction[]>> {
  const response = await api.get<FireflyApiResponse<RecurringTransaction[]>>(
    "recurring",
    {
      params: { page },
    }
  );
  return response.data;
}

export async function getRecurringTransaction(
  api: AxiosInstance,
  id: string
): Promise<FireflyApiResponse<RecurringTransaction>> {
  const response = await api.get<FireflyApiResponse<RecurringTransaction>>(
    `recurring/${id}`
  );
  return response.data;
}

export async function getSubscriptionsBills(
  api: AxiosInstance
): Promise<FireflyApiResponse<AllBillsResponse[]>> {
  const response =
    await api.get<FireflyApiResponse<AllBillsResponse[]>>("bills");
  return response.data;
}
