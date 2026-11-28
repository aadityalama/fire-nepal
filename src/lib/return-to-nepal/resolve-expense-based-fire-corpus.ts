/**
 * Expense-based FIRE corpus for Return Checklist Investment item.
 *
 * Annual eligible living expenses = monthly × 12
 * Required FIRE corpus = annual × 25
 *
 * Prefer Expense Tracking when sufficiently complete; otherwise Budget Tracking.
 * Never sum expense + budget. Never use Savings Goals or profile FIRE goals.
 */

export type InvestmentExpenseTargetSource = "expense_tracking" | "budget_tracking";

export type ExpenseBasedFireCorpus = {
  monthlyEligibleLivingExpensesNpr: number | null;
  annualEligibleLivingExpensesNpr: number | null;
  requiredFireCorpusNpr: number | null;
  investmentTargetSource: InvestmentExpenseTargetSource | null;
};

const FIRE_CORPUS_MULTIPLIER = 25;

/**
 * Resolve the checklist Investment FIRE target from verified living-expense inputs.
 * Null target → TARGET NOT SET (do not invent a silent fallback).
 */
export function resolveExpenseBasedFireCorpus(args: {
  /** Eligible living expenses from Expense Tracking for the current month (excludes transfers/investments/savings). */
  monthlyExpenseTrackingNpr: number | null | undefined;
  /** Normalized monthly Budget Tracking protection / living basis (never COL). */
  monthlyBudgetTrackingNpr: number | null | undefined;
}): ExpenseBasedFireCorpus {
  const expense =
    args.monthlyExpenseTrackingNpr != null &&
    Number.isFinite(args.monthlyExpenseTrackingNpr) &&
    args.monthlyExpenseTrackingNpr > 0
      ? args.monthlyExpenseTrackingNpr
      : null;
  const budget =
    args.monthlyBudgetTrackingNpr != null &&
    Number.isFinite(args.monthlyBudgetTrackingNpr) &&
    args.monthlyBudgetTrackingNpr > 0
      ? args.monthlyBudgetTrackingNpr
      : null;

  let monthly: number | null = null;
  let source: InvestmentExpenseTargetSource | null = null;

  if (expense != null) {
    monthly = expense;
    source = "expense_tracking";
  } else if (budget != null) {
    monthly = budget;
    source = "budget_tracking";
  }

  if (monthly == null || source == null) {
    return {
      monthlyEligibleLivingExpensesNpr: null,
      annualEligibleLivingExpensesNpr: null,
      requiredFireCorpusNpr: null,
      investmentTargetSource: null,
    };
  }

  const annual = monthly * 12;
  return {
    monthlyEligibleLivingExpensesNpr: monthly,
    annualEligibleLivingExpensesNpr: annual,
    requiredFireCorpusNpr: annual * FIRE_CORPUS_MULTIPLIER,
    investmentTargetSource: source,
  };
}

export const EXPENSE_BASED_FIRE_CORPUS_MULTIPLIER = FIRE_CORPUS_MULTIPLIER;
