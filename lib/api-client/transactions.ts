import type {
  AccountTransactionGroup,
  CreateTransactionData,
  FireflyApiResponse,
  TransactionUpdateData,
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
): Promise<FireflyApiResponse<AccountTransactionGroup>> {
  const response = await api.post<FireflyApiResponse<AccountTransactionGroup>>(
    "transactions",
    data
  );
  return response.data;
}

export async function updateTransaction(
  api: AxiosInstance,
  id: string,
  data: TransactionUpdateData
): Promise<FireflyApiResponse<AccountTransactionGroup>> {
  const response = await api.put<FireflyApiResponse<AccountTransactionGroup>>(
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
