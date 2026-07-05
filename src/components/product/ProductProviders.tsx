"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { AuthModalProvider } from "@/contexts/AuthModalContext";
import { FireMembershipProvider } from "@/contexts/FireMembershipContext";
import { SmartRemindersProvider } from "@/contexts/SmartRemindersContext";
import { FireThemeProvider } from "@/contexts/FireThemeContext";
import { HomepageLanguageProvider } from "@/contexts/HomepageLanguageContext";
import { ProductAuthProvider } from "@/contexts/ProductAuthContext";

const AuthModal = dynamic(() => import("@/components/auth/AuthModal").then((mod) => mod.AuthModal), { ssr: false });

export function ProductProviders({ children }: { children: ReactNode }) {
  return (
    <FireThemeProvider>
      <AuthModalProvider>
        <ProductAuthProvider>
          <FireMembershipProvider>
            <SmartRemindersProvider>
              <HomepageLanguageProvider>
                {children}
                <AuthModal />
                <Toaster richColors theme="dark" position="top-center" closeButton />
              </HomepageLanguageProvider>
            </SmartRemindersProvider>
          </FireMembershipProvider>
        </ProductAuthProvider>
      </AuthModalProvider>
    </FireThemeProvider>
  );
}
