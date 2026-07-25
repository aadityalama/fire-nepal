import { redirect } from "next/navigation";

/** Legacy `/market` entry — open the NEPSE Portfolio dashboard directly. */
export default function MarketPage() {
  redirect("/portfolio/investments");
}
