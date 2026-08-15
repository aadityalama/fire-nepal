export type LoanStatus =
  | "draft"
  | "pending_approval"
  | "pending_signature"
  | "active"
  | "completed"
  | "overdue"
  | "rejected"
  | "cancelled"
  | "settled";

export type LoanRole = "lender" | "borrower";
export type LoanType = "personal" | "business" | "peer" | "emergency" | "education";
export type CurrencyCode = "NPR" | "KRW" | "USD";
export type PaymentMethod =
  | "cash"
  | "bank_transfer"
  | "esewa"
  | "khalti"
  | "ime_pay"
  | "qr"
  | "settlement";
export type PaymentStatus = "pending" | "completed" | "partial" | "failed";
export type RequestStatus = "pending" | "accepted" | "rejected" | "changes_requested";
export type InstallmentStatus = "upcoming" | "due" | "paid" | "overdue" | "partial";
export type AgreementStatus = "draft" | "awaiting_signatures" | "active" | "completed" | "void";
export type ConnectionMethod = "fire_id" | "mobile" | "qr" | "invite_link";
export type NotificationKind =
  | "loan_request"
  | "agreement"
  | "signature"
  | "payment_due"
  | "payment_received"
  | "overdue"
  | "settlement"
  | "ai_insight";

export type FireLendingParty = {
  id: string;
  fireNepalId: string;
  name: string;
  mobile: string;
  photoUrl?: string;
  trustScore: number;
  verified: boolean;
  rolePreference: "lender" | "borrower" | "both";
  notes?: string;
  onTimePayments: number;
  latePayments: number;
  loansCompleted: number;
  identityVerified: boolean;
};

export type EmiInstallment = {
  id: string;
  loanId: string;
  sequence: number;
  dueDate: string;
  principal: number;
  interest: number;
  amount: number;
  paidAmount: number;
  status: InstallmentStatus;
};

export type FireLendingLoan = {
  id: string;
  agreementNumber: string;
  /**
   * Viewer-oriented role in this snapshot (legacy / UI).
   * Authorization MUST use lenderId / borrowerId, not this field alone.
   */
  role: LoanRole;
  /** Other party from the snapshot owner's perspective (legacy / UI). */
  counterpartyId: string;
  /** Durable authenticated member/party id for the lender. Must differ from borrowerId. */
  lenderId: string;
  /** Durable authenticated member/party id for the borrower. Must differ from lenderId. */
  borrowerId: string;
  /**
   * Set when lenderId === borrowerId (corrupt/self-loan). Dual-party actions must be refused.
   * Do not silently reinterpret as a valid two-party loan.
   */
  identityInvalid?: boolean;
  amount: number;
  currency: CurrencyCode;
  interestRate: number;
  loanType: LoanType;
  durationMonths: number;
  installmentCount: number;
  gracePeriodDays: number;
  lateFeePercent: number;
  purpose: string;
  notes?: string;
  guarantor?: string;
  collateral?: string;
  status: LoanStatus;
  createdAt: string;
  startDate?: string;
  endDate?: string;
  outstanding: number;
  totalPaid: number;
  interestEarned: number;
  connectionMethod: ConnectionMethod;
  borrowerSigned: boolean;
  lenderSigned: boolean;
  riskScore: number;
};

export type FireLendingPayment = {
  id: string;
  loanId: string;
  installmentId?: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  paidAt: string;
  note?: string;
  isPartial: boolean;
  isSettlement: boolean;
};

export type FireLendingRequest = {
  id: string;
  /** Linked peer loan when the request was created from the loan wizard. */
  loanId?: string;
  fromPartyId: string;
  toPartyId: string;
  amount: number;
  currency: CurrencyCode;
  interestRate: number;
  durationMonths: number;
  purpose: string;
  status: RequestStatus;
  createdAt: string;
  message?: string;
  changeRequest?: string;
};

export type FireLendingAgreement = {
  id: string;
  loanId: string;
  agreementNumber: string;
  status: AgreementStatus;
  generatedAt: string;
  borrowerSignedAt?: string;
  lenderSignedAt?: string;
  terms: string;
  qrPayload: string;
};

export type FireLendingNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href?: string;
  /** When set, only this party should see the notification. */
  forPartyId?: string;
  relatedRequestId?: string;
  relatedLoanId?: string;
};

export type FireLendingDocument = {
  id: string;
  loanId?: string;
  /** Linked loan request when created from the approval flow. */
  requestId?: string;
  partyId?: string;
  title: string;
  kind: "agreement" | "id" | "collateral" | "payment_proof" | "other";
  createdAt: string;
  /** Original file name including extension. */
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  /**
   * Private storage object path (`{userId}/{loanId}/{fileId}.ext`).
   * Prefer signed-url refresh over embedding long-lived public URLs.
   */
  storagePath?: string;
  /**
   * Short-lived signed HTTPS URL or guest data URL for local preview/download.
   * Never treat as a durable public link.
   */
  url?: string;
  uploadStatus?: "pending" | "uploading" | "ready" | "error";
  uploadError?: string;
};

export type PortfolioSummary = {
  healthScore: number;
  netOutstanding: number;
  totalActiveLoans: number;
  totalLent: number;
  totalBorrowed: number;
  interestEarned: number;
  expectedInterest: number;
  collectionRate: number;
  dueToday: number;
  overdue: number;
  trustScore: number;
  aiSummary: string;
  lastUpdated: string;
};

export type LendingKpi = {
  key: string;
  label: string;
  value: string;
  changePct: number;
  sparkline: number[];
  accent: "emerald" | "teal" | "amber" | "rose" | "gold" | "blue";
  tone: "healthy" | "due" | "overdue" | "info";
};

export type AiInsight = {
  id: string;
  severity: "info" | "warning" | "success" | "critical";
  title: string;
  body: string;
  actionLabel?: string;
  href?: string;
  confidence: number;
};

export type UpcomingPaymentItem = {
  id: string;
  loanId: string;
  partyId: string;
  partyName: string;
  amount: number;
  currency: CurrencyCode;
  dueDate: string;
  bucket: "today" | "tomorrow" | "3days" | "7days";
  status: string;
};

export type ActivityItem = {
  id: string;
  kind: "loan_created" | "agreement_signed" | "payment_received" | "reminder_sent" | "settlement";
  title: string;
  body: string;
  at: string;
};

export type TopBorrowerItem = {
  partyId: string;
  name: string;
  trustScore: number;
  outstanding: number;
  nextDue?: string;
  performancePct: number;
};

export type AgreementCenterStats = {
  pendingSignature: number;
  waitingApproval: number;
  active: number;
  completed: number;
  expired: number;
};

export type MonthlySeriesPoint = {
  month: string;
  lending: number;
  borrowing: number;
  interest: number;
  collected: number;
  growth: number;
};

export type FireLendingStore = {
  parties: FireLendingParty[];
  loans: FireLendingLoan[];
  payments: FireLendingPayment[];
  installments: EmiInstallment[];
  requests: FireLendingRequest[];
  agreements: FireLendingAgreement[];
  notifications: FireLendingNotification[];
  documents: FireLendingDocument[];
  currentUserId: string;
};

export type LoanWizardDraft = {
  connectionMethod: ConnectionMethod;
  counterpartyQuery: string;
  counterpartyId: string;
  amount: string;
  currency: CurrencyCode;
  interestRate: string;
  loanType: LoanType;
  durationMonths: string;
  installmentCount: string;
  gracePeriodDays: string;
  lateFeePercent: string;
  purpose: string;
  notes: string;
  guarantor: string;
  collateral: string;
  role: LoanRole;
};

export type FireLendingMobileNavKey = "dashboard" | "loans" | "requests" | "payments" | "more";
