import { api } from "./client";

export type GalleryImage = {
  _id: string;
  imageUrl: string;
  altI18n?: { uk?: string; en?: string } | null;
  sort: number;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export async function listGalleryImages(): Promise<GalleryImage[]> {
  const { data } = await api.get<GalleryImage[]>("/admin/gallery");
  return data;
}

export async function createGalleryImage(
  body: Partial<GalleryImage>,
): Promise<GalleryImage> {
  const { data } = await api.post<GalleryImage>("/admin/gallery", body);
  return data;
}

export async function updateGalleryImage(
  id: string,
  body: Partial<GalleryImage>,
): Promise<GalleryImage> {
  const { data } = await api.patch<GalleryImage>(`/admin/gallery/${id}`, body);
  return data;
}

export async function deleteGalleryImage(id: string): Promise<void> {
  await api.delete(`/admin/gallery/${id}`);
}

export async function reorderGalleryImages(
  ids: string[],
): Promise<GalleryImage[]> {
  const { data } = await api.post<GalleryImage[]>("/admin/gallery/reorder", {
    ids,
  });
  return data;
}
