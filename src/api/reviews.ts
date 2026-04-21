import { api } from "./client";

export type ProductReview = {
  _id: string;
  productId: string;
  customerId?: string;
  authorName?: string;
  rating: number;
  comment?: string;
  isApproved: boolean;
  source: "customer" | "admin";
  createdAt?: string;
  updatedAt?: string;
};

export type ListReviewsParams = {
  page?: number;
  limit?: number;
  isApproved?: "true" | "false";
};

export type ReviewsPage = {
  items: ProductReview[];
  page: number;
  limit: number;
  total: number;
};

export function listReviews(params?: ListReviewsParams): Promise<ReviewsPage> {
  return api.get("/admin/reviews", { params });
}

export type AdminCreateReviewBody = {
  productId: string;
  authorName?: string;
  rating: number;
  comment?: string;
};

export function adminCreateReview(body: AdminCreateReviewBody): Promise<ProductReview> {
  return api.post("/admin/reviews", body);
}

export type AdminUpdateReviewBody = {
  isApproved?: boolean;
  rating?: number;
  comment?: string;
  authorName?: string;
};

export function adminUpdateReview(id: string, body: AdminUpdateReviewBody): Promise<ProductReview> {
  return api.patch(`/admin/reviews/${id}`, body);
}

export function adminDeleteReview(id: string): Promise<{ deleted: boolean }> {
  return api.delete(`/admin/reviews/${id}`);
}
