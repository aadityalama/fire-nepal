export type SavingsGoalTemplate = {
  id: string;
  icon: string;
  name: string;
  category: string;
  suggestedTargetNpr: number;
  suggestedMonthlyNpr: number;
  suggestedMonths: number;
};

export const SAVINGS_GOAL_TEMPLATES: SavingsGoalTemplate[] = [
  { id: "emergency", icon: "🚨", name: "Emergency Fund", category: "Emergency", suggestedTargetNpr: 300000, suggestedMonthlyNpr: 15000, suggestedMonths: 20 },
  { id: "house", icon: "🏡", name: "House / Land Fund", category: "Property", suggestedTargetNpr: 5000000, suggestedMonthlyNpr: 50000, suggestedMonths: 100 },
  { id: "vehicle", icon: "🚗", name: "Vehicle Fund", category: "Transport", suggestedTargetNpr: 1500000, suggestedMonthlyNpr: 25000, suggestedMonths: 60 },
  { id: "travel", icon: "✈️", name: "Travel Fund", category: "Travel", suggestedTargetNpr: 200000, suggestedMonthlyNpr: 10000, suggestedMonths: 20 },
  { id: "marriage", icon: "💍", name: "Marriage Fund", category: "Life Event", suggestedTargetNpr: 800000, suggestedMonthlyNpr: 20000, suggestedMonths: 40 },
  { id: "child-education", icon: "👶", name: "Child Education Fund", category: "Education", suggestedTargetNpr: 1200000, suggestedMonthlyNpr: 15000, suggestedMonths: 80 },
  { id: "higher-education", icon: "🎓", name: "Higher Education Fund", category: "Education", suggestedTargetNpr: 600000, suggestedMonthlyNpr: 12000, suggestedMonths: 50 },
  { id: "device", icon: "📱", name: "Phone / Laptop Fund", category: "Gadgets", suggestedTargetNpr: 120000, suggestedMonthlyNpr: 8000, suggestedMonths: 15 },
  { id: "investment", icon: "💰", name: "Investment Fund", category: "Investment", suggestedTargetNpr: 500000, suggestedMonthlyNpr: 20000, suggestedMonths: 25 },
  { id: "fixed-deposit", icon: "🏦", name: "Fixed Deposit", category: "Banking", suggestedTargetNpr: 250000, suggestedMonthlyNpr: 10000, suggestedMonths: 25 },
  { id: "gold", icon: "🪙", name: "Gold Savings", category: "Gold", suggestedTargetNpr: 300000, suggestedMonthlyNpr: 12000, suggestedMonths: 25 },
  { id: "nepal-return", icon: "🏠", name: "Nepal Return Fund", category: "Return to Nepal", suggestedTargetNpr: 2000000, suggestedMonthlyNpr: 30000, suggestedMonths: 67 },
  { id: "retirement", icon: "👴", name: "Retirement Fund", category: "Retirement", suggestedTargetNpr: 10000000, suggestedMonthlyNpr: 40000, suggestedMonths: 250 },
];

export const CUSTOM_GOAL_TEMPLATE: SavingsGoalTemplate = {
  id: "custom",
  icon: "➕",
  name: "Custom Goal",
  category: "Custom",
  suggestedTargetNpr: 100000,
  suggestedMonthlyNpr: 5000,
  suggestedMonths: 20,
};

export const CUSTOM_GOAL_ICONS = ["🎯", "💼", "🏦", "🛡️", "🎁", "🧳", "💡", "🌱", "📈", "🏥", "🎉", "⭐"];
