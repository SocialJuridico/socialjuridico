import {
  listAdminReviews,
  moderateAdminReview,
} from "@/lib/reviews/reviewAdminHandlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = listAdminReviews;
export const PATCH = moderateAdminReview;
