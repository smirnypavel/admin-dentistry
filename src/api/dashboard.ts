import { api } from "./client";

export type DashboardRange = {
  from: string;
  to: string;
  granularity: "day" | "week" | "month";
  timezone: string;
};

export type DashboardSummary = {
  ordersTotal: number;
  ordersNonCancelled: number;
  revenue: number;
  itemsSold: number;
  avgOrderValue: number;
};

export type DashboardSalesPoint = {
  periodStart: string;
  orders: number;
  revenue: number;
  itemsSold: number;
};

export type DashboardTopProduct = {
  productId: string;
  title: string;
  quantity: number;
  revenue: number;
};

export type DashboardRecentOrder = {
  _id: string;
  phone?: string;
  clientId?: string;
  itemsTotal?: number;
  total: number;
  status: string;
  itemsCount: number;
  createdAt: string;
};

export type DashboardCatalogHealth = {
  productsTotal: number;
  productsActive: number;
  variantsTotal: number;
  productsWithImages: number;
  productsWithoutImages: number;
};

export type DashboardDiscountsHealth = {
  total: number;
  activeNow: number;
  upcoming: number;
  expired: number;
};

export type GetDashboardResponse = {
  range: DashboardRange;
  summary: DashboardSummary;
  salesSeries: DashboardSalesPoint[];
  topProducts: DashboardTopProduct[];
  recentOrders: DashboardRecentOrder[];
  catalogHealth: DashboardCatalogHealth;
  discountsHealth: DashboardDiscountsHealth;
};

export async function getDashboard(params?: {
  from?: string;
  to?: string;
  granularity?: "day" | "week" | "month";
  tz?: string;
  topLimit?: number;
  recentLimit?: number;
}): Promise<GetDashboardResponse> {
  const res = await api.get<GetDashboardResponse>("/admin/dashboard", {
    params,
  });
  return res.data;
}
