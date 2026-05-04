import { api } from './client';

export function getAdminPageContent(key: string): Promise<Record<string, unknown>> {
  return api.get(`/admin/pages/${encodeURIComponent(key)}`).then((r) => r.data);
}

export function updatePageContent(key: string, data: Record<string, unknown>): Promise<unknown> {
  return api.put(`/admin/pages/${encodeURIComponent(key)}`, data).then((r) => r.data);
}
