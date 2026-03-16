import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCompactCurrency(amount: number) {
  if (Math.abs(amount) >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)}Cr`;
  }
  if (Math.abs(amount) >= 100000) {
    return `₹${(amount / 100000).toFixed(2)}L`;
  }
  if (Math.abs(amount) >= 1000) {
    return `₹${(amount / 1000).toFixed(2)}k`;
  }
  return `₹${amount.toFixed(2)}`;
}

export const EXPENSE_CATEGORIES = [
  "Food & Dining",
  "Shopping",
  "Entertainment",
  "Transport",
  "Health & Medical",
  "Education",
  "Bills & Utilities",
  "Groceries",
  "Travel",
  "Personal Care",
  "Gifts & Donations",
  "Investment",
  "Rent/Housing",
  "Other Expense",
];

export const INCOME_CATEGORIES = [
  "Salary",
  "Freelance",
  "Business",
  "Investment Returns",
  "Gift",
  "Rental Income",
  "Other Income",
];
