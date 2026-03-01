import type { CategoryArray, CategoryRead, CategoryUpdate } from "@/types";
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

export async function updateCategory(
  api: AxiosInstance,
  id: string,
  data: CategoryUpdate
): Promise<FireflyApiResponse<CategoryRead>> {
  const response = await api.put<FireflyApiResponse<CategoryRead>>(
    `categories/${id}`,
    data
  );
  return response.data;
}

export async function deleteCategory(
  api: AxiosInstance,
  id: string
): Promise<void> {
  await api.delete(`categories/${id}`);
}
