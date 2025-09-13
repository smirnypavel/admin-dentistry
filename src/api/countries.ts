import { api } from "./client";

export type Country = {
  _id: string;
  code: string;
  name: string;
  slug: string;
  flagUrl?: string | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CreateCountryDto = {
  code: string;
  name: string;
  slug: string;
  flagUrl?: string;
  isActive?: boolean;
};

export type UpdateCountryDto = Partial<CreateCountryDto> & {
  flagUrl?: string | null;
};

export async function listCountries(): Promise<Country[]> {
  const { data } = await api.get<Country[]>("/admin/countries");
  return data;
}

export async function createCountry(
  payload: CreateCountryDto
): Promise<Country> {
  const { data } = await api.post<Country>("/admin/countries", payload);
  return data;
}

export async function updateCountry(
  id: string,
  payload: UpdateCountryDto
): Promise<Country | null> {
  const { data } = await api.patch<Country | null>(
    `/admin/countries/${id}`,
    payload
  );
  return data;
}

export async function deleteCountry(id: string): Promise<Country | null> {
  const { data } = await api.delete<Country | null>(`/admin/countries/${id}`);
  return data;
}
