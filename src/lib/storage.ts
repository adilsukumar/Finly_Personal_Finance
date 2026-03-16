export type AccountType = "personal" | "shared";

export interface Transaction {
  id: string;
  accountType: AccountType;
  budgetMonthId: string;
  date: string;
  amount: number;
  description: string;
  category: string;
  type: "expense" | "income";
  notes?: string;
  paidBy?: string;
  syncedFromId?: string;
  createdAt: string;
}

export interface IOU {
  id: string;
  accountType: AccountType;
  person: string;
  amount: number;
  description: string;
  direction: "they_owe_me" | "i_owe_them";
  paidBy?: string;
  settled: boolean;
  settledAt?: string;
  date: string;
  createdAt: string;
}

export interface BudgetMonth {
  id: string;
  accountType: AccountType;
  label: string;
  startDate: string;
  endDate?: string;
  initialBalance: number;
  active: boolean;
}

export interface MonthStartPreference {
  accountType: AccountType;
  pendingNewMonth: {
    calendarMonth: string;
    prompted: boolean;
    userDecision?: "yes" | "no";
    decisionDate?: string;
  } | null;
}

const KEYS = {
  transactions: "finly_transactions",
  ious: "finly_ious",
  budgetMonths: "finly_budget_months",
  monthPrefs: "finly_month_prefs",
  settings: "finly_settings",
  pin: "finly_pin",
};

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── Transactions ──────────────────────────────────────────────────
export function getTransactions(accountType: AccountType): Transaction[] {
  return load<Transaction[]>(KEYS.transactions, []).filter(
    (t) => t.accountType === accountType
  );
}

export function getAllTransactions(): Transaction[] {
  return load<Transaction[]>(KEYS.transactions, []);
}

export function getTransactionsByMonth(accountType: AccountType, budgetMonthId: string): Transaction[] {
  return load<Transaction[]>(KEYS.transactions, []).filter(
    (t) => t.accountType === accountType && t.budgetMonthId === budgetMonthId
  );
}

export function addTransaction(
  data: Omit<Transaction, "id" | "createdAt">
): Transaction {
  const all = load<Transaction[]>(KEYS.transactions, []);
  const tx: Transaction = { ...data, id: uid(), createdAt: new Date().toISOString() };
  save(KEYS.transactions, [...all, tx]);
  return tx;
}

export function updateTransaction(id: string, data: Partial<Transaction>): void {
  const all = load<Transaction[]>(KEYS.transactions, []);
  save(
    KEYS.transactions,
    all.map((t) => (t.id === id ? { ...t, ...data } : t))
  );
}

export function deleteTransaction(id: string): void {
  const all = load<Transaction[]>(KEYS.transactions, []);
  save(KEYS.transactions, all.filter((t) => t.id !== id));
}

export function deleteTransactionsBySyncedFromId(syncedFromId: string): void {
  const all = load<Transaction[]>(KEYS.transactions, []);
  save(KEYS.transactions, all.filter((t) => t.syncedFromId !== syncedFromId));
}

export function updateTransactionBySyncedFromId(syncedFromId: string, data: Partial<Omit<Transaction, "id" | "accountType" | "budgetMonthId" | "createdAt" | "syncedFromId">>): void {
  const all = load<Transaction[]>(KEYS.transactions, []);
  save(KEYS.transactions, all.map((t) => t.syncedFromId === syncedFromId ? { ...t, ...data } : t));
}

// ── IOUs ──────────────────────────────────────────────────────────
export function getIOUs(accountType: AccountType): IOU[] {
  return load<IOU[]>(KEYS.ious, []).filter((i) => i.accountType === accountType);
}

export function getAllIOUs(): IOU[] {
  return load<IOU[]>(KEYS.ious, []);
}

export function markIOUSettled(id: string): IOU {
  const all = load<IOU[]>(KEYS.ious, []);
  const iou = all.find((i) => i.id === id);
  if (!iou) throw new Error("IOU not found");
  const now = new Date().toISOString();
  save(KEYS.ious, all.map((i) => (i.id === id ? { ...i, settled: true, settledAt: now } : i)));
  return { ...iou, settled: true, settledAt: now };
}

export function addSettlementTransaction(iou: IOU, accountType: AccountType, budgetMonthId: string): Transaction {
  const type: "income" | "expense" = iou.direction === "they_owe_me" ? "income" : "expense";
  const category = type === "income" ? "other_income" : "others";
  const description = type === "income"
    ? `${iou.person} paid back: ${iou.description || "IOU"}`
    : `Paid back to ${iou.person}: ${iou.description || "IOU"}`;
  return addTransaction({
    accountType,
    budgetMonthId,
    date: new Date().toISOString().slice(0, 10),
    amount: iou.amount,
    description,
    category,
    type,
    notes: `Auto-added from IOU settlement`,
    paidBy: type === "expense" ? "Adil Sukumar" : iou.person,
  });
}

export function addIOU(data: Omit<IOU, "id" | "createdAt" | "settled">): IOU {
  const all = load<IOU[]>(KEYS.ious, []);
  const iou: IOU = {
    ...data,
    id: uid(),
    settled: false,
    createdAt: new Date().toISOString(),
  };
  save(KEYS.ious, [...all, iou]);
  return iou;
}

export function settleIOU(
  id: string,
  accountType: AccountType,
  budgetMonthId: string
): { iou: IOU; transaction: Transaction } {
  const all = load<IOU[]>(KEYS.ious, []);
  const iou = all.find((i) => i.id === id);
  if (!iou) throw new Error("IOU not found");

  const now = new Date().toISOString();
  const updated = all.map((i) =>
    i.id === id ? { ...i, settled: true, settledAt: now } : i
  );
  save(KEYS.ious, updated);

  const category = iou.direction === "they_owe_me" ? "other_income" : "others";
  const type: "income" | "expense" =
    iou.direction === "they_owe_me" ? "income" : "expense";
  const description =
    iou.direction === "they_owe_me"
      ? `${iou.person} paid back: ${iou.description}`
      : `Paid back to ${iou.person}: ${iou.description}`;

  const tx = addTransaction({
    accountType,
    budgetMonthId,
    date: now.slice(0, 10),
    amount: iou.amount,
    description,
    category,
    type,
    notes: `Auto-added from IOU settlement`,
  });

  return { iou: { ...iou, settled: true, settledAt: now }, transaction: tx };
}

export function deleteIOU(id: string): void {
  const all = load<IOU[]>(KEYS.ious, []);
  save(KEYS.ious, all.filter((i) => i.id !== id));
}

export function updateIOU(id: string, data: Partial<IOU>): void {
  const all = load<IOU[]>(KEYS.ious, []);
  save(KEYS.ious, all.map((i) => (i.id === id ? { ...i, ...data } : i)));
}

// ── Budget Months ────────────────────────────────────────────────
export function getBudgetMonths(accountType: AccountType): BudgetMonth[] {
  return load<BudgetMonth[]>(KEYS.budgetMonths, [])
    .filter((m) => m.accountType === accountType)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function getActiveBudgetMonth(accountType: AccountType): BudgetMonth | null {
  return (
    load<BudgetMonth[]>(KEYS.budgetMonths, []).find(
      (m) => m.accountType === accountType && m.active
    ) ?? null
  );
}

export function createBudgetMonth(
  accountType: AccountType,
  label: string,
  startDate: string,
  initialBalance: number
): BudgetMonth {
  const all = load<BudgetMonth[]>(KEYS.budgetMonths, []);
  const updated = all.map((m) =>
    m.accountType === accountType ? { ...m, active: false } : m
  );
  const month: BudgetMonth = {
    id: uid(),
    accountType,
    label,
    startDate,
    initialBalance,
    active: true,
  };
  save(KEYS.budgetMonths, [...updated, month]);
  return month;
}

export function setActiveBudgetMonth(id: string, accountType: AccountType): void {
  const all = load<BudgetMonth[]>(KEYS.budgetMonths, []);
  save(
    KEYS.budgetMonths,
    all.map((m) =>
      m.accountType === accountType ? { ...m, active: m.id === id } : m
    )
  );
}

export function updateBudgetMonth(id: string, data: Partial<BudgetMonth>): void {
  const all = load<BudgetMonth[]>(KEYS.budgetMonths, []);
  save(KEYS.budgetMonths, all.map((m) => (m.id === id ? { ...m, ...data } : m)));
}

// ── Month-Start Preferences ───────────────────────────────────────
export function getMonthPrefs(): MonthStartPreference[] {
  return load<MonthStartPreference[]>(KEYS.monthPrefs, []);
}

export function getMonthPrefForAccount(accountType: AccountType): MonthStartPreference | null {
  return getMonthPrefs().find((p) => p.accountType === accountType) ?? null;
}

export function setMonthPref(pref: MonthStartPreference): void {
  const all = getMonthPrefs().filter((p) => p.accountType !== pref.accountType);
  save(KEYS.monthPrefs, [...all, pref]);
}

/**
 * Check if a new calendar month started and the user hasn't been prompted yet.
 * Returns true if we should show the "Start new month?" dialog.
 */
export function shouldPromptNewMonth(accountType: AccountType): boolean {
  const active = getActiveBudgetMonth(accountType);
  if (!active) return false;

  const now = new Date();
  const currentCalMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const activeStart = new Date(active.startDate);
  const activeCalMonth = `${activeStart.getFullYear()}-${String(activeStart.getMonth() + 1).padStart(2, "0")}`;

  if (currentCalMonth <= activeCalMonth) return false;

  const pref = getMonthPrefForAccount(accountType);
  if (!pref?.pendingNewMonth) {
    // Set a pending prompt
    setMonthPref({
      accountType,
      pendingNewMonth: {
        calendarMonth: currentCalMonth,
        prompted: false,
      },
    });
    return true;
  }

  if (pref.pendingNewMonth.calendarMonth === currentCalMonth) {
    return !pref.pendingNewMonth.prompted || pref.pendingNewMonth.userDecision === undefined;
  }

  return false;
}

export function respondToNewMonthPrompt(
  accountType: AccountType,
  decision: "yes" | "no",
  budgetMonthId?: string
): void {
  const pref = getMonthPrefForAccount(accountType);
  if (!pref?.pendingNewMonth) return;
  setMonthPref({
    ...pref,
    pendingNewMonth: {
      ...pref.pendingNewMonth,
      prompted: true,
      userDecision: decision,
      decisionDate: new Date().toISOString(),
    },
  });

  if (decision === "no" && budgetMonthId) {
    // User wants to continue with old month — do nothing to the budget month
    // New transactions will just be added with today's date to the current month
  }
}

// ── Settings ─────────────────────────────────────────────────────
interface Settings {
  lastSelectedAccount?: AccountType;
  personalLabel: string;
  sharedLabel: string;
  currency: string;
  sharedContribAdil: number;
  sharedContribSnehal: number;
}

const DEFAULT_SETTINGS: Settings = {
  personalLabel: "Personal 👤",
  sharedLabel: "Shared 👥",
  currency: "₹",
  sharedContribAdil: 0,
  sharedContribSnehal: 0,
};

export function getSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...load<Partial<Settings>>(KEYS.settings, {}) };
}

export function updateSettings(data: Partial<Settings>): void {
  const current = getSettings();
  save(KEYS.settings, { ...current, ...data });
}

// ── Summary Computation ───────────────────────────────────────────
export interface Summary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  initialBalance: number;
  currentBalance: number;
  categoryBreakdown: { category: string; amount: number; percentage: number; count: number; type: string }[];
  monthlyTrend: { month: string; income: number; expenses: number; net: number }[];
  topExpenseCategories: { category: string; amount: number; percentage: number; count: number; type: string }[];
  incomeVsExpenseByMonth: { month: string; income: number; expenses: number }[];
  dailySpending: { date: string; amount: number }[];
}

/** Build a Summary from an arbitrary list of transactions + an initial balance. */
export function computeSummaryFromTxs(txs: Transaction[], initialBalance: number): Summary {
  let totalIncome = 0;
  let totalExpenses = 0;
  const categoryMap: Record<string, { amount: number; count: number; type: string }> = {};

  txs.forEach((t) => {
    if (t.type === "income") totalIncome += t.amount;
    else totalExpenses += t.amount;
    if (!categoryMap[t.category]) categoryMap[t.category] = { amount: 0, count: 0, type: t.type };
    categoryMap[t.category].amount += t.amount;
    categoryMap[t.category].count += 1;
  });

  const categoryBreakdown = Object.entries(categoryMap).map(([cat, data]) => ({
    category: cat,
    amount: data.amount,
    percentage:
      data.type === "expense" && totalExpenses > 0
        ? (data.amount / totalExpenses) * 100
        : totalIncome > 0 ? (data.amount / totalIncome) * 100 : 0,
    count: data.count,
    type: data.type,
  }));

  const topExpenseCategories = categoryBreakdown
    .filter((c) => c.type === "expense")
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  const monthlyMap: Record<string, { income: number; expenses: number }> = {};
  txs.forEach((t) => {
    const key = t.date.slice(0, 7);
    if (!monthlyMap[key]) monthlyMap[key] = { income: 0, expenses: 0 };
    if (t.type === "income") monthlyMap[key].income += t.amount;
    else monthlyMap[key].expenses += t.amount;
  });
  const monthlyTrend = Object.keys(monthlyMap).sort().slice(-12).map((key) => {
    const [y, m] = key.split("-");
    const label = new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleString("default", { month: "short", year: "numeric" });
    return { month: label, income: monthlyMap[key].income, expenses: monthlyMap[key].expenses, net: monthlyMap[key].income - monthlyMap[key].expenses };
  });

  const dailyMap: Record<string, number> = {};
  txs.filter((t) => t.type === "expense").forEach((t) => {
    if (!dailyMap[t.date]) dailyMap[t.date] = 0;
    dailyMap[t.date] += t.amount;
  });
  const dailySpending = Object.entries(dailyMap).sort(([a], [b]) => a.localeCompare(b)).slice(-30).map(([date, amount]) => ({ date, amount }));

  return {
    totalIncome, totalExpenses,
    netBalance: totalIncome - totalExpenses,
    initialBalance,
    currentBalance: initialBalance + totalIncome - totalExpenses,
    categoryBreakdown, monthlyTrend, topExpenseCategories,
    incomeVsExpenseByMonth: monthlyTrend.map((m) => ({ month: m.month, income: m.income, expenses: m.expenses })),
    dailySpending,
  };
}

export function computeSummary(
  accountType: AccountType,
  budgetMonthId?: string
): Summary {
  const allTxs = getTransactions(accountType);
  const periodTxs = budgetMonthId
    ? allTxs.filter((t) => t.budgetMonthId === budgetMonthId)
    : allTxs;

  const months = getBudgetMonths(accountType);
  const activeBM = budgetMonthId
    ? months.find((m) => m.id === budgetMonthId)
    : getActiveBudgetMonth(accountType);
  const initialBalance = activeBM?.initialBalance ?? 0;

  let totalIncome = 0;
  let totalExpenses = 0;
  const categoryMap: Record<string, { amount: number; count: number; type: string }> = {};

  periodTxs.forEach((t) => {
    if (t.type === "income") totalIncome += t.amount;
    else totalExpenses += t.amount;

    if (!categoryMap[t.category]) {
      categoryMap[t.category] = { amount: 0, count: 0, type: t.type };
    }
    categoryMap[t.category].amount += t.amount;
    categoryMap[t.category].count += 1;
  });

  const categoryBreakdown = Object.entries(categoryMap).map(([cat, data]) => ({
    category: cat,
    amount: data.amount,
    percentage:
      data.type === "expense" && totalExpenses > 0
        ? (data.amount / totalExpenses) * 100
        : totalIncome > 0
        ? (data.amount / totalIncome) * 100
        : 0,
    count: data.count,
    type: data.type,
  }));

  const topExpenseCategories = categoryBreakdown
    .filter((c) => c.type === "expense")
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  // Monthly trend across all transactions for this account
  const monthlyMap: Record<string, { income: number; expenses: number }> = {};
  allTxs.forEach((t) => {
    const key = t.date.slice(0, 7);
    if (!monthlyMap[key]) monthlyMap[key] = { income: 0, expenses: 0 };
    if (t.type === "income") monthlyMap[key].income += t.amount;
    else monthlyMap[key].expenses += t.amount;
  });

  const sortedKeys = Object.keys(monthlyMap).sort().slice(-12);
  const monthlyTrend = sortedKeys.map((key) => {
    const [y, m] = key.split("-");
    const label = new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleString("default", {
      month: "short",
      year: "numeric",
    });
    return {
      month: label,
      income: monthlyMap[key].income,
      expenses: monthlyMap[key].expenses,
      net: monthlyMap[key].income - monthlyMap[key].expenses,
    };
  });

  const incomeVsExpenseByMonth = monthlyTrend.map((m) => ({
    month: m.month,
    income: m.income,
    expenses: m.expenses,
  }));

  // Daily spending (last 30 days from period)
  const dailyMap: Record<string, number> = {};
  periodTxs
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      if (!dailyMap[t.date]) dailyMap[t.date] = 0;
      dailyMap[t.date] += t.amount;
    });
  const dailySpending = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, amount]) => ({ date, amount }));

  return {
    totalIncome,
    totalExpenses,
    netBalance: totalIncome - totalExpenses,
    initialBalance,
    currentBalance: initialBalance + totalIncome - totalExpenses,
    categoryBreakdown,
    monthlyTrend,
    topExpenseCategories,
    incomeVsExpenseByMonth,
    dailySpending,
  };
}

// ── Export Data ───────────────────────────────────────────────────
export function exportAllData(): string {
  return JSON.stringify({
    transactions: load(KEYS.transactions, []),
    ious: load(KEYS.ious, []),
    budgetMonths: load(KEYS.budgetMonths, []),
    settings: load(KEYS.settings, {}),
    exportedAt: new Date().toISOString(),
  }, null, 2);
}

export function importData(jsonString: string): void {
  const data = JSON.parse(jsonString);
  if (data.transactions) save(KEYS.transactions, data.transactions);
  if (data.ious) save(KEYS.ious, data.ious);
  if (data.budgetMonths) save(KEYS.budgetMonths, data.budgetMonths);
  if (data.settings) save(KEYS.settings, data.settings);
}

export function clearAllData(): void {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}

// ── PIN Security (PBKDF2 via Web Crypto — 200k iterations) ──────────
const PBKDF2_SALT = "finly_v2_pbkdf2_salt_secure_2026";
const LEGACY_SALT = "finly_v1_secure_salt_2024";
const PBKDF2_ITERATIONS = 200000;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30 * 60 * 1000; // 30 minutes

interface PinData {
  hash: string;
  version: "sha256" | "pbkdf2";
  attempts: number;
  lockedUntil: number | null;
}

async function hashPinPBKDF2(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(PBKDF2_SALT),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPinSHA256Legacy(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(LEGACY_SALT + pin + LEGACY_SALT);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getPinData(): PinData | null {
  return load<PinData | null>(KEYS.pin, null);
}

export function isPinSet(): boolean {
  const d = getPinData();
  return !!(d && d.hash);
}

export function getLockoutRemainingSeconds(): number {
  const d = getPinData();
  if (!d?.lockedUntil) return 0;
  const remaining = d.lockedUntil - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

export async function setupPin(pin: string): Promise<void> {
  const hash = await hashPinPBKDF2(pin);
  save(KEYS.pin, { hash, version: "pbkdf2", attempts: 0, lockedUntil: null });
}

export async function verifyPin(pin: string): Promise<"correct" | "wrong" | "locked"> {
  const d = getPinData();
  if (!d) return "wrong";

  const now = Date.now();
  if (d.lockedUntil && now < d.lockedUntil) return "locked";

  const version = d.version ?? "sha256";
  const hash = version === "pbkdf2"
    ? await hashPinPBKDF2(pin)
    : await hashPinSHA256Legacy(pin);

  if (hash === d.hash) {
    // Upgrade legacy hashes to PBKDF2 on successful verify
    if (version === "sha256") {
      const newHash = await hashPinPBKDF2(pin);
      save(KEYS.pin, { hash: newHash, version: "pbkdf2", attempts: 0, lockedUntil: null });
    } else {
      save(KEYS.pin, { ...d, attempts: 0, lockedUntil: null });
    }
    return "correct";
  }

  const attempts = (d.attempts || 0) + 1;
  const lockedUntil = attempts >= MAX_ATTEMPTS ? now + LOCKOUT_MS : d.lockedUntil;
  save(KEYS.pin, { ...d, attempts, lockedUntil });
  return "wrong";
}

export function resetPin(): void {
  localStorage.removeItem(KEYS.pin);
}

export function getAttemptsRemaining(): number {
  const d = getPinData();
  if (!d) return MAX_ATTEMPTS;
  return Math.max(0, MAX_ATTEMPTS - (d.attempts || 0));
}
