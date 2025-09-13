import { api } from "./client";

export type OrderItemSnapshot = {
  productId: string;
  sku: string;
  quantity: number;
  price: number; // final price after discounts
  priceOriginal?: number; // original price before discounts
  title: string;
  options: Record<string, string | number>;
  manufacturerId?: string | null;
  countryId?: string | null;
  unit?: string | null;
  discountsApplied?: Array<{
    discountId: string;
    name: string;
    type: "percent" | "fixed";
    value: number;
    priceBefore: number;
    priceAfter: number;
  }>;
};

export type Order = {
  _id: string;
  phone: string;
  clientId: string;
  items: OrderItemSnapshot[];
  itemsTotal: number;
  deliveryFee: number;
  total: number;
  status: "new" | "processing" | "done" | "cancelled";
  name?: string | null;
  comment?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ListOrdersParams = {
  status?: "new" | "processing" | "done" | "cancelled";
  phone?: string;
  clientId?: string;
  createdFrom?: string; // ISO
  createdTo?: string; // ISO
  sort?: string; // e.g. -createdAt
  page?: number;
  limit?: number;
};

export type ListOrdersResponse = {
  items: Order[];
  page: number;
  limit: number;
  total: number;
};

export async function listOrders(
  params: ListOrdersParams
): Promise<ListOrdersResponse> {
  const { data } = await api.get<ListOrdersResponse>("/admin/orders", {
    params,
  });
  return data;
}

export async function getOrder(id: string): Promise<Order | null> {
  const { data } = await api.get<Order | null>(`/admin/orders/${id}`);
  return data;
}

export async function updateOrderStatus(
  id: string,
  status: Order["status"]
): Promise<Order | null> {
  const { data } = await api.patch<Order | null>(`/admin/orders/${id}/status`, {
    status,
  });
  return data;
}
