import type { Metadata } from "next";
import { ForgotPasswordScreen } from "@/components/product/auth/ForgotPasswordScreen";

export const metadata: Metadata = {
  title: "Forgot password | FIRE Nepal",
  description: "Request a password reset for your FIRE Nepal account.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordScreen />;
}
