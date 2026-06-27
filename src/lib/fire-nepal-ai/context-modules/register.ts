import "server-only";

import { registerFireAiContextModule } from "@/lib/fire-nepal-ai/context-builder";
import { buildCashflowContext } from "@/lib/fire-nepal-ai/context-modules/cashflow-context";
import { buildExpenseInsightsContext } from "@/lib/fire-nepal-ai/context-modules/expense-context";
import { buildFireGuidanceContext } from "@/lib/fire-nepal-ai/context-modules/fire-guidance-context";
import { buildWealthSummaryContext } from "@/lib/fire-nepal-ai/context-modules/wealth-context";

registerFireAiContextModule({
  id: "expense_tracker",
  label: "Expense Insights",
  fetch: buildExpenseInsightsContext,
});

registerFireAiContextModule({
  id: "cashflow",
  label: "Cashflow Intelligence",
  fetch: buildCashflowContext,
});

registerFireAiContextModule({
  id: "net_worth",
  label: "Wealth Summary",
  fetch: buildWealthSummaryContext,
});

registerFireAiContextModule({
  id: "fire_progress",
  label: "FIRE Guidance",
  fetch: buildFireGuidanceContext,
});
