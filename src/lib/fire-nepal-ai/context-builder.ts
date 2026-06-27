/**
 * Extensible context architecture for FIRE AI.
 * Future milestones will register module fetchers for each FIRE Nepal product.
 */

export type FireAiContextModuleId =
  | "expense_tracker"
  | "cashflow"
  | "portfolio"
  | "net_worth"
  | "fire_progress"
  | "savings_goals"
  | "family_wealth"
  | "child_education"
  | "fire_biz"
  | "nepal_cost_of_living"
  | "return_to_nepal";

export type FireAiContextModule = {
  id: FireAiContextModuleId;
  label: string;
  /** Returns a markdown snippet for the system prompt, or null if unavailable. */
  fetch: (userId: string) => Promise<string | null>;
};

const registeredModules: FireAiContextModule[] = [];

/** Register a context module (called at app init in future milestones). */
export function registerFireAiContextModule(module: FireAiContextModule): void {
  const idx = registeredModules.findIndex((m) => m.id === module.id);
  if (idx >= 0) registeredModules[idx] = module;
  else registeredModules.push(module);
}

/** List registered module IDs for debugging / admin. */
export function listFireAiContextModules(): FireAiContextModuleId[] {
  return registeredModules.map((m) => m.id);
}

/**
 * Assemble user financial context for the AI system prompt.
 * Modules are fetched in parallel; failures are skipped gracefully.
 */
export async function buildFireAiUserContext(
  userId: string,
  enabledModules?: FireAiContextModuleId[],
): Promise<string> {
  const modules = enabledModules
    ? registeredModules.filter((m) => enabledModules.includes(m.id))
    : registeredModules;

  if (modules.length === 0) {
    return "_No connected financial modules yet. Provide general FIRE Nepal guidance._";
  }

  const results = await Promise.allSettled(modules.map((m) => m.fetch(userId)));
  const sections: string[] = [];

  results.forEach((result, i) => {
    const mod = modules[i];
    if (result.status === "fulfilled" && result.value) {
      sections.push(`### ${mod.label}\n${result.value}`);
    }
  });

  return sections.length > 0
    ? sections.join("\n\n")
    : "_Financial modules are registered but no data is available yet._";
}
