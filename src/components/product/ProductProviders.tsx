"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { AuthModal } from "@/components/auth/AuthModal";
import { AuthModalProvider } from "@/contexts/AuthModalContext";
import { FireMembershipProvider } from "@/contexts/FireMembershipContext";
import { FireThemeProvider } from "@/contexts/FireThemeContext";
import { ProductAuthProvider } from "@/contexts/ProductAuthContext";

export function ProductProviders({ children }: { children: ReactNode }) {
  return (
    <FireThemeProvider>
      <AuthModalProvider>
        <ProductAuthProvider>
          <FireMembershipProvider>
            {children}
            <AuthModal />
            <Toaster richColors theme="dark" position="top-center" closeButton />
          </FireMembershipProvider>
        </ProductAuthProvider>
      </AuthModalProvider>
    </FireThemeProvider>
  );
}
