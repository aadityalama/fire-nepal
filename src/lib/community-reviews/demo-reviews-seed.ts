/**
 * Canonical demo reviews migrated from the homepage hardcoded testimonials.
 * Used by SQL migration seed and as a local fallback when Supabase is unavailable.
 */

export type DemoReviewSeed = {
  full_name: string;
  city: string;
  country: string;
  rating: number;
  review_title: string;
  review_text: string;
  verified: boolean;
  display_order: number;
};

export const HOMEPAGE_DEMO_REVIEWS: DemoReviewSeed[] = [
  {
    full_name: "Bikash Gurung",
    city: "Busan",
    country: "Korea",
    rating: 5,
    review_title: "Nepal return planning made practical",
    review_text: "The planner finally made my Nepal return number feel practical.",
    verified: true,
    display_order: 1,
  },
  {
    full_name: "Sita Magar",
    city: "Incheon",
    country: "Korea",
    rating: 5,
    review_title: "Savings and remittance planning",
    review_text: "Savings tracker and cost planning changed how I send money home.",
    verified: true,
    display_order: 2,
  },
  {
    full_name: "Rajesh Chaudhary",
    city: "Daegu",
    country: "Korea",
    rating: 5,
    review_title: "Clear emergency fund and SIP steps",
    review_text: "AI advice gave me clear steps for emergency fund and SIPs.",
    verified: true,
    display_order: 3,
  },
  {
    full_name: "Anita Shrestha",
    city: "Seoul",
    country: "Korea",
    rating: 5,
    review_title: "All-in-one FIRE progress view",
    review_text: "I can see FIRE progress, family goals, and readiness in one place.",
    verified: true,
    display_order: 4,
  },
];

/** Parse legacy "City, Country" place strings from homepage translations. */
export function parseReviewPlace(place: string): { city: string; country: string } {
  const parts = place.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { city: parts[0]!, country: parts.slice(1).join(", ") };
  }
  return { city: place.trim(), country: "" };
}

export function reviewInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
  }
  return (parts[0]?.[0] ?? "?").toUpperCase();
}
