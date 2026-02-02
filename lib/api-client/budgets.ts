import type {
  Budget,
  BudgetLimitsListResponse,
  CreateBudgetData,
  FireflyApiResponse,
} from "@/types";
import type { AxiosInstance } from "axios";

export async function getBudgets(
  api: AxiosInstance,
  page: number = 1,
  start?: string,
  end?: string
): Promise<FireflyApiResponse<Budget[]>> {
  const response = await api.get<FireflyApiResponse<Budget[]>>("budgets", {
    params: { page, start, end },
  });
  return response.data;
}

export async function getAllBudgets(
  api: AxiosInstance,
  getBudgetsFn: (
    api: AxiosInstance,
    page: number,
    start?: string,
    end?: string
  ) => Promise<FireflyApiResponse<Budget[]>>,
  start?: string,
  end?: string
): Promise<FireflyApiResponse<Budget[]>> {
  const firstPageResponse = await getBudgetsFn(api, 1, start, end);
  const allBudgets = [...(firstPageResponse.data || [])];

  const totalPages = firstPageResponse.meta?.pagination?.total_pages || 1;

  if (totalPages > 1) {
    const pagePromises = [];
    for (let page = 2; page <= totalPages; page++) {
      pagePromises.push(getBudgetsFn(api, page, start, end));
    }

    const remainingPages = await Promise.all(pagePromises);
    remainingPages.forEach((pageResponse) => {
      if (pageResponse.data) {
        allBudgets.push(...pageResponse.data);
      }
    });
  }

  return {
    ...firstPageResponse,
    data: allBudgets,
  };
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
  start: string,
  end: string,
  page: number = 1
): Promise<BudgetLimitsListResponse> {
  const response = await api.get<BudgetLimitsListResponse>(`budget-limits`, {
    params: {
      start,
      end,
      page,
    },
  });
  return response.data;
}

export async function getAllBudgetLimits(
  api: AxiosInstance,
  getBudgetLimitsFn: (
    api: AxiosInstance,
    start: string,
    end: string,
    page?: number
  ) => Promise<BudgetLimitsListResponse>,
  start: string,
  end: string
): Promise<BudgetLimitsListResponse> {
  const firstPageResponse = await getBudgetLimitsFn(api, start, end, 1);
  const allBudgetLimits = [...(firstPageResponse.data || [])];

  const totalPages = firstPageResponse.meta?.pagination?.total_pages || 1;

  if (totalPages > 1) {
    const pagePromises = [];
    for (let page = 2; page <= totalPages; page++) {
      pagePromises.push(getBudgetLimitsFn(api, start, end, page));
    }

    const remainingPages = await Promise.all(pagePromises);
    remainingPages.forEach((pageResponse) => {
      if (pageResponse.data) {
        allBudgetLimits.push(...pageResponse.data);
      }
    });
  }

  return {
    ...firstPageResponse,
    data: allBudgetLimits,
  };
}
