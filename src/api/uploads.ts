import { api } from "./client";

export type UploadImageResponse = {
  url: string;
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
};

export async function uploadImage(
  file: File,
  folder?: string
): Promise<UploadImageResponse> {
  const form = new FormData();
  form.append("file", file);
  if (folder) form.append("folder", folder);
  const { data } = await api.post<UploadImageResponse>(
    "/admin/uploads/image",
    form,
    {
      headers: { "Content-Type": "multipart/form-data" },
    }
  );
  return data;
}
