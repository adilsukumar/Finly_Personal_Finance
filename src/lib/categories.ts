export type CategoryType = "expense" | "income" | "both";

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  type: CategoryType;
}

export const EXPENSE_CATEGORIES: Category[] = [
  { id: "food", name: "Food", color: "#60A5FA", icon: "🍜", type: "expense" },
  { id: "stationary", name: "Stationary", color: "#A78BFA", icon: "✏️", type: "expense" },
  { id: "gifts", name: "Gifts", color: "#86EFAC", icon: "🎁", type: "expense" },
  { id: "health", name: "Health/Medical", color: "#6EE7B7", icon: "💊", type: "expense" },
  { id: "transportation", name: "Transportation", color: "#34D399", icon: "🚗", type: "expense" },
  { id: "outing", name: "Outing", color: "#1E3A5F", icon: "🎉", type: "expense" },
  { id: "utilities", name: "Utilities", color: "#475569", icon: "⚡", type: "expense" },
  { id: "travel", name: "Travel", color: "#93C5FD", icon: "✈️", type: "both" },
  { id: "others", name: "Others", color: "#C4B5FD", icon: "📦", type: "expense" },
  { id: "hackathon", name: "Hackathon", color: "#F59E0B", icon: "💻", type: "both" },
  { id: "club", name: "Club", color: "#059669", icon: "🎭", type: "expense" },
  { id: "savings", name: "Savings", color: "#7C3AED", icon: "🏦", type: "both" },
];

export const INCOME_CATEGORIES: Category[] = [
  { id: "salary", name: "Salary", color: "#34D399", icon: "💰", type: "income" },
  { id: "freelance", name: "Freelance", color: "#60A5FA", icon: "💼", type: "income" },
  { id: "business", name: "Business", color: "#F59E0B", icon: "🏢", type: "income" },
  { id: "investment", name: "Investment Returns", color: "#A78BFA", icon: "📈", type: "income" },
  { id: "gift_received", name: "Gift Received", color: "#86EFAC", icon: "🎀", type: "income" },
  { id: "rental", name: "Rental Income", color: "#FCA5A5", icon: "🏠", type: "income" },
  { id: "allowance", name: "Allowance", color: "#6EE7B7", icon: "💸", type: "income" },
  { id: "other_income", name: "Other Income", color: "#C4B5FD", icon: "💵", type: "income" },
];

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export function getCategoryById(id: string): Category | undefined {
  return ALL_CATEGORIES.find((c) => c.id === id);
}

export function getCategoryColor(id: string): string {
  return getCategoryById(id)?.color ?? "#94A3B8";
}

export function getCategoryIcon(id: string): string {
  return getCategoryById(id)?.icon ?? "📌";
}
