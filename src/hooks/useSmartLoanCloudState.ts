"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clearSmartLoanLocalCache,
  defaultSmartLoanCloudDocument,
  loadGuestSmartLoanDocument,
  saveGuestSmartLoanDocument,
  sanitizeSmartLoanCloudDocument,
  type SmartLoanCloudDocument,
} from "@/lib/smart-loan/cloud-storage";
import { useCloudDocumentState } from "@/hooks/useCloudDocumentState";

type SmartLoanProfile = SmartLoanCloudDocument["profiles"][number];
type SmartLoanVaultDocument = SmartLoanCloudDocument["documents"][number];

export function useSmartLoanCloudState<TProfile, TVault>(args: {
  normalizeProfile: (raw: SmartLoanProfile) => TProfile;
  normalizeDocument: (raw: SmartLoanVaultDocument) => TVault;
  defaultProfiles: TProfile[];
  defaultDocuments: TVault[];
}) {
  const normalizeProfileRef = useRef(args.normalizeProfile);
  const normalizeDocumentRef = useRef(args.normalizeDocument);
  normalizeProfileRef.current = args.normalizeProfile;
  normalizeDocumentRef.current = args.normalizeDocument;

  const { state: cloudDoc, setState: setCloudDoc, hydrated, cloudReady } = useCloudDocumentState({
    moduleKey: "smart_loan",
    getDefault: defaultSmartLoanCloudDocument,
    sanitize: sanitizeSmartLoanCloudDocument,
    loadLocal: loadGuestSmartLoanDocument,
    saveLocal: saveGuestSmartLoanDocument,
    clearLocal: clearSmartLoanLocalCache,
  });

  const [loanProfiles, setLoanProfilesState] = useState<TProfile[]>(args.defaultProfiles);
  const [documents, setDocumentsState] = useState<TVault[]>(args.defaultDocuments);
  const [lentMoney, setLentMoneyState] = useState(0);
  const [borrowedMoney, setBorrowedMoneyState] = useState(0);
  const [interestIncome, setInterestIncomeState] = useState(0);

  useEffect(() => {
    if (!hydrated) return;
    setLoanProfilesState(cloudDoc.profiles.map((row) => normalizeProfileRef.current(row)));
    setDocumentsState(cloudDoc.documents.map((row) => normalizeDocumentRef.current(row)));
    setLentMoneyState(cloudDoc.lentMoney);
    setBorrowedMoneyState(cloudDoc.borrowedMoney);
    setInterestIncomeState(cloudDoc.interestIncome);
  }, [hydrated, cloudDoc]);

  const syncCloud = useCallback(
    (patch: Partial<SmartLoanCloudDocument>) => {
      setCloudDoc((prev) => sanitizeSmartLoanCloudDocument({ ...prev, ...patch }));
    },
    [setCloudDoc],
  );

  const setLoanProfiles = useCallback(
    (value: TProfile[] | ((prev: TProfile[]) => TProfile[])) => {
      setLoanProfilesState((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        syncCloud({ profiles: next as unknown[] });
        return next;
      });
    },
    [syncCloud],
  );

  const setDocuments = useCallback(
    (value: TVault[] | ((prev: TVault[]) => TVault[])) => {
      setDocumentsState((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        syncCloud({ documents: next as unknown[] });
        return next;
      });
    },
    [syncCloud],
  );

  const setLentMoney = useCallback(
    (value: number | ((prev: number) => number)) => {
      setLentMoneyState((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        syncCloud({ lentMoney: next });
        return next;
      });
    },
    [syncCloud],
  );

  const setBorrowedMoney = useCallback(
    (value: number | ((prev: number) => number)) => {
      setBorrowedMoneyState((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        syncCloud({ borrowedMoney: next });
        return next;
      });
    },
    [syncCloud],
  );

  const setInterestIncome = useCallback(
    (value: number | ((prev: number) => number)) => {
      setInterestIncomeState((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        syncCloud({ interestIncome: next });
        return next;
      });
    },
    [syncCloud],
  );

  return useMemo(
    () => ({
      loanProfiles,
      setLoanProfiles,
      documents,
      setDocuments,
      lentMoney,
      setLentMoney,
      borrowedMoney,
      setBorrowedMoney,
      interestIncome,
      setInterestIncome,
      hydrated,
      cloudReady,
    }),
    [
      loanProfiles,
      setLoanProfiles,
      documents,
      setDocuments,
      lentMoney,
      setLentMoney,
      borrowedMoney,
      setBorrowedMoney,
      interestIncome,
      setInterestIncome,
      hydrated,
      cloudReady,
    ],
  );
}
