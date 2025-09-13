import { api } from "./client";

export type Manufacturer = {
  _id: string;
  name: string;
  slug: string;
  countryIds: string[];
  logoUrl?: string | null;
  bannerUrl?: string | null;
  website?: string | null;
  description?: string | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CreateManufacturerDto = {
  name: string;
  slug: string;
  countryIds?: string[];
  logoUrl?: string;
  bannerUrl?: string;
  website?: string;
  description?: string;
  isActive?: boolean;
};

export type UpdateManufacturerDto = Partial<CreateManufacturerDto> & {
  logoUrl?: string | null;
  bannerUrl?: string | null;
};

export async function listManufacturers(): Promise<Manufacturer[]> {
  const { data } = await api.get<Manufacturer[]>("/admin/manufacturers");
  return data;
}

export async function createManufacturer(
  payload: CreateManufacturerDto
): Promise<Manufacturer> {
  const { data } = await api.post<Manufacturer>(
    "/admin/manufacturers",
    payload
  );
  return data;
}

export async function updateManufacturer(
  id: string,
  payload: UpdateManufacturerDto
): Promise<Manufacturer | null> {
  const { data } = await api.patch<Manufacturer | null>(
    `/admin/manufacturers/${id}`,
    payload
  );
  return data;
}

export async function deleteManufacturer(
  id: string
): Promise<Manufacturer | null> {
  const { data } = await api.delete<Manufacturer | null>(
    `/admin/manufacturers/${id}`
  );
  return data;
}
