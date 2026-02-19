import { api } from "./client";

export type CustomerListItem = {
  _id: string;
  phone: string;
  name?: string | null;
  email?: string | null;
  isPhoneVerified?: boolean;
  marketingOptIn?: boolean;
  ordersCount: number;
  ordersTotal: number;
  lastLoginAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CustomerDetail = CustomerListItem;

export type ListCustomersParams = {
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
};

export type ListCustomersResponse = {
  items: CustomerListItem[];
  page: number;
  limit: number;
  total: number;
};

export type CustomerOrder = {
  _id: string;
  phone: string;
  clientId: string;
  items: unknown[];
  itemsTotal: number;
  deliveryFee: number;
  total: number;
  status: "new" | "processing" | "done" | "cancelled";
  name?: string | null;
  comment?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ListCustomerOrdersResponse = {
  items: CustomerOrder[];
  page: number;
  limit: number;
  total: number;
};

export async function listCustomers(
  params: ListCustomersParams,
): Promise<ListCustomersResponse> {
  const { data } = await api.get<ListCustomersResponse>("/admin/customers", {
    params,
  });
  return data;
}

export async function getCustomer(id: string): Promise<CustomerDetail | null> {
  const { data } = await api.get<CustomerDetail | null>(
    `/admin/customers/${id}`,
  );
  return data;
}

export async function getCustomerOrders(
  id: string,
  params?: { page?: number; limit?: number },
): Promise<ListCustomerOrdersResponse> {
  const { data } = await api.get<ListCustomerOrdersResponse>(
    `/admin/customers/${id}/orders`,
    { params },
  );
  return data;
}
