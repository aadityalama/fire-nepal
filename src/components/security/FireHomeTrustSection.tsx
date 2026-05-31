"use client";

import {
  Cloud,
  Database,
  EyeOff,
  Globe2,
  Lock,
  Server,
  Shield,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { EncryptionBadge, TrustBullet } from "@/components/security/SecurityUi";
import { useHomepageLanguage } from "@/contexts/HomepageLanguageContext";

export function FireHomeTrustSection() {
  const { copy } = useHomepageLanguage();
  const trustCopy = copy.trust;
  const bulletIcons = [Lock, EyeOff, Globe2];
  const cardIcons = [Shield, UserCheck, Server, Cloud, Database];

  return (
    <section id="security-trust" className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-gradient-to-b from-emerald-500/10 to-transparent blur-2xl" />
      <div className="relative overflow-hidden rounded-[2rem] border border-emerald-500/15 bg-gradient-to-br from-[#041a14] via-[#06261c] to-[#030806] p-6 text-white shadow-[0_32px_90px_rgba(0,0,0,0.35)] sm:p-8 lg:p-10">
        <div className="absolute -right-20 top-0 h-72 w-72 rounded-full bg-lime-400/10 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-start">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <EncryptionBadge>{trustCopy.encryption}</EncryptionBadge>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-100/90">
                <ShieldCheck size={11} aria-hidden />
                {trustCopy.trustLayer}
              </span>
            </div>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-[2.35rem]">
              {trustCopy.title}
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-emerald-50/75 sm:text-[1.05rem]">
              {trustCopy.body}
            </p>
            <ul className="mt-6 space-y-2 text-sm font-semibold text-emerald-100/80">
              {trustCopy.bullets.map((bullet, index) => {
                const Icon = bulletIcons[index] ?? Lock;

                return (
                  <li key={bullet} className="flex items-start gap-2">
                    <Icon size={16} className="mt-0.5 shrink-0 text-emerald-400" aria-hidden />
                    {bullet}
                  </li>
                );
              })}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-lime-400 px-5 py-2.5 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-900/30 transition hover:-translate-y-0.5"
              >
                {trustCopy.createAccount}
              </Link>
              <Link
                href="/dashboard/security"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-black text-emerald-50 transition hover:bg-white/10"
              >
                {trustCopy.securityCenter}
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {trustCopy.cards.map(({ title, body }, index) => (
              <TrustBullet key={title} icon={cardIcons[index] ?? Shield} title={title} body={body} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
