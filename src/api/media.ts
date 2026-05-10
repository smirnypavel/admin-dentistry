import { api } from "./client";

export interface MediaFolder {
  name: string;
  path: string;
}

export interface MediaFile {
  public_id: string;
  secure_url: string;
  url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  created_at: string;
  folder: string;
}

export async function listFolders(prefix?: string): Promise<MediaFolder[]> {
  const { data } = await api.get<{ folders: MediaFolder[] }>("/admin/media/folders", {
    params: prefix ? { prefix } : {},
  });
  return data.folders;
}

export async function listFiles(folder?: string, cursor?: string): Promise<{ files: MediaFile[]; next_cursor?: string }> {
  const { data } = await api.get<{ files: MediaFile[]; next_cursor?: string }>("/admin/media/files", {
    params: { ...(folder ? { folder } : {}), ...(cursor ? { cursor } : {}) },
  });
  return data;
}

export async function createFolder(path: string): Promise<void> {
  await api.post("/admin/media/folders", { path });
}

export async function deleteFolder(path: string): Promise<void> {
  await api.delete("/admin/media/folders", { data: { path } });
}

export async function deleteFile(publicId: string): Promise<void> {
  await api.post("/admin/uploads/image/delete", { publicId });
}

export async function uploadFile(file: File, folder: string): Promise<MediaFile> {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);
  const { data } = await api.post<MediaFile>("/admin/uploads/image", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
