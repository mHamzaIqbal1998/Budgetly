import type {
  AccountTransactionGroup,
  CreateTransactionData,
  FireflyApiResponse,
  Transaction,
} from "@/types";
import type { AxiosInstance } from "axios";

export async function getTransactions(
  api: AxiosInstance,
  page: number = 1,
  start?: string,
  end?: string,
  type?: string,
  limit?: number
): Promise<FireflyApiResponse<AccountTransactionGroup[]>> {
  const response = await api.get<FireflyApiResponse<AccountTransactionGroup[]>>(
    "transactions",
    {
      params: { page, start, end, type, limit },
    }
  );
  return response.data;
}

export async function getTransaction(
  api: AxiosInstance,
  id: string
): Promise<FireflyApiResponse<AccountTransactionGroup>> {
  const response = await api.get<FireflyApiResponse<AccountTransactionGroup>>(
    `transactions/${id}`
  );
  return response.data;
}

export async function createTransaction(
  api: AxiosInstance,
  data: CreateTransactionData
): Promise<FireflyApiResponse<Transaction>> {
  const response = await api.post<FireflyApiResponse<Transaction>>(
    "transactions",
    data
  );
  return response.data;
}

export async function updateTransaction(
  api: AxiosInstance,
  id: string,
  data: CreateTransactionData
): Promise<FireflyApiResponse<Transaction>> {
  const response = await api.put<FireflyApiResponse<Transaction>>(
    `transactions/${id}`,
    data
  );
  return response.data;
}

export async function deleteTransaction(
  api: AxiosInstance,
  id: string
): Promise<void> {
  await api.delete(`transactions/${id}`);
}
