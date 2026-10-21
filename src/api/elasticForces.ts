import { api } from "./client";

/** A reusable "own" elastic force, saved globally (shared across all products). */
export type GlobalForce = {
  group: "intra" | "extra";
  forceName: string;
  oz: string;
  g: string;
  level: number;
};

// Stored in the generic page-content key/value store under this key,
// so no dedicated backend endpoint is needed.
const KEY = "elastic-forces";

export async function getGlobalElasticForces(): Promise<GlobalForce[]> {
  try {
    const { data } = await api.get<{ forces?: GlobalForce[] }>(
      `/admin/pages/${KEY}`,
    );
    return Array.isArray(data?.forces) ? data.forces : [];
  } catch {
    return [];
  }
}

export async function saveGlobalElasticForces(
  forces: GlobalForce[],
): Promise<void> {
  await api.put(`/admin/pages/${KEY}`, { forces });
}
