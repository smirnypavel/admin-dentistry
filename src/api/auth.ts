import { api } from "./client";

export type AdminUserListItem = {
  username: string;
  name?: string | null;
  isActive: boolean;
};

export type CreateAdminRequest = {
  username: string;
  password: string;
  name?: string | null;
};

export async function fetchAdminUsers() {
  const { data } = await api.get<AdminUserListItem[]>("/admin/auth/users");
  return data;
}

export async function createAdminUser(body: CreateAdminRequest) {
  const { data } = await api.post<AdminUserListItem>("/admin/auth/users", body);
  return data;
}
