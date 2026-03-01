import type { CategoryArray, CategoryRead } from "@/types";
import type { FireflyApiResponse } from "@/types/common";
import type { AxiosInstance } from "axios";

export async function getCategories(
  api: AxiosInstance,
  page: number = 1
): Promise<CategoryArray> {
  const response = await api.get<CategoryArray>("categories", {
    params: { page },
  });
  return response.data;
}

export async function getCategory(
  api: AxiosInstance,
  id: string,
  start?: string,
  end?: string
): Promise<FireflyApiResponse<CategoryRead>> {
  const response = await api.get<FireflyApiResponse<CategoryRead>>(
    `categories/${id}`,
    {
      params: { start, end },
    }
  );
  return response.data;
}
