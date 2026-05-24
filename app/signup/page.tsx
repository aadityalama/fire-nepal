import type { Metadata } from "next";
import { SignupScreen } from "@/components/product/auth/SignupScreen";

export const metadata: Metadata = {
  title: "Create account | FIRE Nepal",
  description: "Create your FIRE Nepal account with email verification and optional profile photo.",
};

export default function SignupPage() {
  return <SignupScreen />;
}
