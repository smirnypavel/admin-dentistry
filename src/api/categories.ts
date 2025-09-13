import { api } from "./client";

export type Category = {
  _id: string;
  slug: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  sort?: number | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CreateCategoryDto = {
  slug: string;
  name: string;
  description?: string;
  imageUrl?: string;
  sort?: number;
  isActive?: boolean;
};

export type UpdateCategoryDto = Partial<CreateCategoryDto> & {
  imageUrl?: string | null;
};

export async function listCategories(): Promise<Category[]> {
  const { data } = await api.get<Category[]>("/admin/categories");
  return data;
}

export async function createCategory(
  payload: CreateCategoryDto
): Promise<Category> {
  const { data } = await api.post<Category>("/admin/categories", payload);
  return data;
}

export async function updateCategory(
  id: string,
  payload: UpdateCategoryDto
): Promise<Category | null> {
  const { data } = await api.patch<Category | null>(
    `/admin/categories/${id}`,
    payload
  );
  return data;
}

export async function deleteCategory(id: string): Promise<Category | null> {
  const { data } = await api.delete<Category | null>(`/admin/categories/${id}`);
  return data;
}
