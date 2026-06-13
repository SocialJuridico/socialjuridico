import {
  listClientReviews,
  submitClientReview,
} from "@/lib/reviews/reviewClientHandlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = listClientReviews;
export const POST = submitClientReview;
