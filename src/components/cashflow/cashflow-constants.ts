import type { ExpenseCategoryKey, IncomeSourceKey } from "@/components/cashflow/types";

export const INCOME_SOURCE_META: { key: IncomeSourceKey; label: string; hint: string }[] = [
  { key: "salary", label: "Salary", hint: "Base pay (monthly)" },
  { key: "overtime", label: "Overtime", hint: "Average monthly" },
  { key: "rentalIncome", label: "Rental income", hint: "Net of local costs" },
  { key: "dividendIncome", label: "Dividend income", hint: "Cash dividends" },
  {
    key: "depositInterestIncome",
    label: "Deposit interest (FD)",
    hint: "Synced from portfolio fixed deposits (modelled monthly NPR)",
  },
  { key: "freelanceIncome", label: "Freelance income", hint: "Side contracts" },
  { key: "businessIncome", label: "Business income", hint: "Owner draw / profit" },
  { key: "socialMediaIncome", label: "Social media income", hint: "Brand / platform" },
];

export const EXPENSE_CATEGORY_META: { key: ExpenseCategoryKey; label: string; hint: string }[] = [
  { key: "rent", label: "Rent", hint: "Housing" },
  { key: "food", label: "Food", hint: "Groceries & dining" },
  { key: "transportation", label: "Transportation", hint: "Fuel, transit, flights" },
  { key: "familySupport", label: "Family support", hint: "Remittance home" },
  { key: "emiLoans", label: "EMI / loans", hint: "Debt payments" },
  { key: "entertainment", label: "Entertainment", hint: "Leisure" },
  { key: "insurance", label: "Insurance", hint: "Health, life, vehicle" },
];
