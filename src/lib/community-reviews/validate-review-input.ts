export type ReviewInputPayload = {
  full_name?: string;
  country?: string;
  city?: string;
  rating?: number;
  review_title?: string;
  review_text?: string;
};

export type ValidatedReviewInput = {
  full_name: string;
  country: string | null;
  city: string | null;
  rating: number;
  review_title: string;
  review_text: string;
};

const LIMITS = {
  full_name: { min: 2, max: 80 },
  city: { max: 80 },
  country: { max: 80 },
  review_title: { min: 5, max: 120 },
  review_text: { min: 20, max: 2000 },
} as const;

export function validateReviewInput(body: ReviewInputPayload): { ok: true; data: ValidatedReviewInput } | { ok: false; error: string } {
  const full_name = body.full_name?.trim() ?? "";
  const review_title = body.review_title?.trim() ?? "";
  const review_text = body.review_text?.trim() ?? "";
  const city = body.city?.trim() ?? "";
  const country = body.country?.trim() ?? "";

  if (full_name.length < LIMITS.full_name.min || full_name.length > LIMITS.full_name.max) {
    return { ok: false, error: `Name must be ${LIMITS.full_name.min}–${LIMITS.full_name.max} characters.` };
  }
  if (city.length > LIMITS.city.max) {
    return { ok: false, error: `City must be at most ${LIMITS.city.max} characters.` };
  }
  if (country.length > LIMITS.country.max) {
    return { ok: false, error: `Country must be at most ${LIMITS.country.max} characters.` };
  }
  if (review_title.length < LIMITS.review_title.min || review_title.length > LIMITS.review_title.max) {
    return { ok: false, error: `Title must be ${LIMITS.review_title.min}–${LIMITS.review_title.max} characters.` };
  }
  if (review_text.length < LIMITS.review_text.min || review_text.length > LIMITS.review_text.max) {
    return { ok: false, error: `Review message must be ${LIMITS.review_text.min}–${LIMITS.review_text.max} characters.` };
  }

  const rating = Math.round(Number(body.rating ?? 5));
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "Please select a rating from 1 to 5 stars." };
  }

  if (/(.)\1{7,}/.test(review_text) || /(.)\1{7,}/.test(review_title)) {
    return { ok: false, error: "Review looks like spam. Please write a genuine message." };
  }

  return {
    ok: true,
    data: {
      full_name,
      country: country || null,
      city: city || null,
      rating,
      review_title,
      review_text,
    },
  };
}
