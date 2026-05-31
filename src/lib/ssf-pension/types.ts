export type ContributionStatus = "paid" | "pending" | "missing";

export type SsfMonthlyContribution = {
  id: string;
  year: number;
  month: number;
  label: string;
  employeeNpr: number;
  employerNpr: number;
  interestNpr: number;
  status: ContributionStatus;
};

export type SsfBenefitRow = {
  id: string;
  label: string;
  status: "eligible" | "review" | "locked";
  detail: string;
};

export type SsfNotificationKind = "premium_due" | "pension_update" | "employer_missing" | "milestone";

export type SsfNotification = {
  id: string;
  kind: SsfNotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};

export type NomineeRow = {
  id: string;
  name: string;
  relation: string;
  sharePct: number;
};

export type NepalRetireVerdict = "SAFE" | "MODERATE RISK" | "HIGH RISK";
