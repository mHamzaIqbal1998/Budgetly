import type { CategoryArray } from "@/types";
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
