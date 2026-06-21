"use client";

import { Settings } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DashboardSectionHeader } from "@/components/DashboardSectionHeader";
import { FireBizGlassCard, FireBizInput, FireBizPrimaryButton } from "@/components/fire-biz/FireBizUiPrimitives";
import { useFireBiz, useFireBizCopy } from "@/contexts/FireBizContext";

function SettingsForm({
  profileKey,
  initial,
  onSave,
  saving,
  copy,
}: {
  profileKey: string;
  initial: {
    businessName: string;
    businessType: string;
    panVat: string;
    phone: string;
    email: string;
    address: string;
  };
  onSave: (values: typeof initial) => Promise<void>;
  saving: boolean;
  copy: ReturnType<typeof useFireBizCopy>;
}) {
  const [businessName, setBusinessName] = useState(initial.businessName);
  const [businessType, setBusinessType] = useState(initial.businessType);
  const [panVat, setPanVat] = useState(initial.panVat);
  const [phone, setPhone] = useState(initial.phone);
  const [email, setEmail] = useState(initial.email);
  const [address, setAddress] = useState(initial.address);
  const s = copy.settings;

  return (
    <form
      key={profileKey}
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave({ businessName, businessType, panVat, phone, email, address });
      }}
    >
      <FireBizInput label={s.businessName} value={businessName} onChange={setBusinessName} />
      <FireBizInput label={s.businessType} value={businessType} onChange={setBusinessType} />
      <FireBizInput label={s.panVat} value={panVat} onChange={setPanVat} />
      <FireBizInput label={s.phone} value={phone} onChange={setPhone} type="tel" />
      <FireBizInput label={s.email} value={email} onChange={setEmail} type="email" />
      <div className="sm:col-span-2">
        <FireBizInput label={s.address} value={address} onChange={setAddress} />
      </div>
      <div className="sm:col-span-2">
        <FireBizPrimaryButton type="submit">{saving ? copy.common.loading : s.save}</FireBizPrimaryButton>
      </div>
    </form>
  );
}

export function FireBizSettingsPage() {
  const copy = useFireBizCopy();
  const s = copy.settings;
  const { profile, saveProfile, loading } = useFireBiz();
  const [saving, setSaving] = useState(false);

  const initial = {
    businessName: profile?.business_name ?? "",
    businessType: profile?.business_type ?? "",
    panVat: profile?.pan_vat ?? "",
    phone: profile?.phone ?? "",
    email: profile?.email ?? "",
    address: profile?.address ?? "",
  };

  async function handleSave(values: typeof initial) {
    setSaving(true);
    try {
      await saveProfile({
        business_name: values.businessName || "My Business",
        business_type: values.businessType || null,
        pan_vat: values.panVat || null,
        phone: values.phone || null,
        email: values.email || null,
        address: values.address || null,
      });
      toast.success(s.save);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <DashboardSectionHeader eyebrow={copy.moduleName} title={s.title} subtitle={s.subtitle} />
      <FireBizGlassCard title={s.title} icon={Settings}>
        {loading ? (
          <p className="text-sm font-semibold text-emerald-200/60">{copy.common.loading}</p>
        ) : (
          <SettingsForm
            profileKey={profile?.id ?? "new-profile"}
            initial={initial}
            onSave={handleSave}
            saving={saving}
            copy={copy}
          />
        )}
      </FireBizGlassCard>
    </div>
  );
}
