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

export async function getBills(
  api: AxiosInstance,
  page: number = 1,
  limit: number = 50
): Promise<FireflyApiResponse<AllBillsResponse[]>> {
  const response = await api.get<FireflyApiResponse<AllBillsResponse[]>>(
    "bills",
    {
      params: { page, limit },
    }
  );
  return response.data;
}

export async function getBill(
  api: AxiosInstance,
  id: string,
  start?: string,
  end?: string
): Promise<FireflyApiResponse<AllBillsResponse>> {
  const params: Record<string, string> = {};
  if (start) params.start = start;
  if (end) params.end = end;
  const response = await api.get<FireflyApiResponse<AllBillsResponse>>(
    `bills/${id}`,
    { params }
  );
  return response.data;
}

export async function createBill(
  api: AxiosInstance,
  data: Record<string, unknown>
): Promise<FireflyApiResponse<AllBillsResponse>> {
  const response = await api.post<FireflyApiResponse<AllBillsResponse>>(
    "bills",
    data
  );
  return response.data;
}

export async function updateBill(
  api: AxiosInstance,
  id: string,
  data: Record<string, unknown>
): Promise<FireflyApiResponse<AllBillsResponse>> {
  const response = await api.put<FireflyApiResponse<AllBillsResponse>>(
    `bills/${id}`,
    data
  );
  return response.data;
}

export async function getBillsWithDates(
  api: AxiosInstance,
  page: number = 1,
  limit: number = 50,
  start?: string,
  end?: string
): Promise<FireflyApiResponse<AllBillsResponse[]>> {
  const params: Record<string, unknown> = { page, limit };
  if (start) params.start = start;
  if (end) params.end = end;
  const response = await api.get<FireflyApiResponse<AllBillsResponse[]>>(
    "bills",
    { params }
  );
  return response.data;
}

export async function deleteBill(
  api: AxiosInstance,
  id: string
): Promise<void> {
  await api.delete(`bills/${id}`);
}
