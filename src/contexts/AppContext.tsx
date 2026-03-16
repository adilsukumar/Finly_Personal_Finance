import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import type { AccountType, Transaction, IOU, BudgetMonth } from "@/lib/storage";
import {
  getSettings,
  updateSettings,
  getTransactionsByMonth,
  getAllTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  deleteTransactionsBySyncedFromId,
  updateTransactionBySyncedFromId,
  getAllIOUs,
  getIOUs,
  addIOU,
  markIOUSettled,
  addSettlementTransaction,
  deleteIOU,
  updateIOU,
  getBudgetMonths,
  getActiveBudgetMonth,
  createBudgetMonth,
  setActiveBudgetMonth,
  updateBudgetMonth,
  computeSummary,
  shouldPromptNewMonth,
  respondToNewMonthPrompt,
  exportAllData,
  importData,
  isPinSet,
} from "@/lib/storage";
import type { Summary } from "@/lib/storage";

export type AppScreen = "landing" | "month-select" | "dashboard" | "transactions" | "analytics" | "ious" | "settings";

interface NewMonthPrompt {
  show: boolean;
  calendarMonth: string;
}

export type PinScreen = "none" | "setup" | "verify";

interface AppContextType {
  screen: AppScreen;
  setScreen: (s: AppScreen) => void;

  pinScreen: PinScreen;
  onPinSuccess: () => void;
  onPinCancel: () => void;

  activeAccount: AccountType | null;
  selectAccount: (account: AccountType) => void;

  activeBudgetMonth: BudgetMonth | null;
  allBudgetMonths: BudgetMonth[];
  createNewBudgetMonth: (label: string, startDate: string, initialBalance: number) => void;
  switchBudgetMonth: (id: string) => void;
  updateBudgetMonthBalance: (id: string, initialBalance: number) => void;

  newMonthPrompt: NewMonthPrompt;
  respondToNewMonth: (decision: "yes" | "no") => void;

  transactions: Transaction[];
  addTx: (data: Omit<Transaction, "id" | "createdAt">) => void;
  updateTx: (id: string, data: Partial<Transaction>) => void;
  deleteTx: (id: string) => void;
  refreshTransactions: () => void;

  ious: IOU[];
  addIou: (data: Omit<IOU, "id" | "createdAt" | "settled">) => void;
  settleIou: (id: string) => void;
  deleteIou: (id: string) => void;
  updateIou: (id: string, data: Partial<IOU>) => void;
  refreshIOUs: () => void;

  summary: Summary | null;
  refreshSummary: () => void;

  settings: ReturnType<typeof getSettings>;
  updateAppSettings: (data: Partial<ReturnType<typeof getSettings>>) => void;

  exportData: () => string;
  importDataFromJson: (json: string) => void;

  currency: string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [screen, setScreenState] = useState<AppScreen>("landing");
  const [activeAccount, setActiveAccount] = useState<AccountType | null>(null);
  const [activeBudgetMonth, setActiveBudgetMonthState] = useState<BudgetMonth | null>(null);
  const [allBudgetMonths, setAllBudgetMonths] = useState<BudgetMonth[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [ious, setIous] = useState<IOU[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [settings, setSettingsState] = useState(getSettings());
  const [newMonthPrompt, setNewMonthPrompt] = useState<NewMonthPrompt>({ show: false, calendarMonth: "" });
  const [pinScreen, setPinScreen] = useState<PinScreen>("none");
  const [pendingAccount, setPendingAccount] = useState<AccountType | null>(null);

  const setScreen = useCallback((s: AppScreen) => {
    setScreenState(s);
    window.scrollTo(0, 0);
  }, []);

  const loadMonths = useCallback((account: AccountType) => {
    const months = getBudgetMonths(account);
    setAllBudgetMonths(months);
    const active = getActiveBudgetMonth(account);
    setActiveBudgetMonthState(active);
    return { months, active };
  }, []);

  const refreshTransactions = useCallback(() => {
    if (!activeAccount || !activeBudgetMonth) return;
    setTransactions(getTransactionsByMonth(activeAccount, activeBudgetMonth.id));
  }, [activeAccount, activeBudgetMonth]);

  const refreshIOUs = useCallback(() => {
    if (!activeAccount) return;
    if (activeAccount === "shared") {
      // Shared sees ALL IOUs from both accounts
      setIous(getAllIOUs());
    } else {
      setIous(getIOUs(activeAccount));
    }
  }, [activeAccount]);

  const refreshSummary = useCallback(() => {
    if (!activeAccount || !activeBudgetMonth) return;
    setSummary(computeSummary(activeAccount, activeBudgetMonth.id));
  }, [activeAccount, activeBudgetMonth]);

  useEffect(() => {
    if (activeAccount && activeBudgetMonth) {
      refreshTransactions();
      refreshIOUs();
      refreshSummary();
    }
  }, [activeAccount, activeBudgetMonth, refreshTransactions, refreshIOUs, refreshSummary]);

  const navigateAfterAuth = useCallback((account: AccountType) => {
    const { active } = loadMonths(account);
    const months = getBudgetMonths(account);

    // On shared login, sync contributions → initialBalance in case it drifted
    if (account === "shared" && active) {
      const s = getSettings();
      const combined = (s.sharedContribAdil ?? 0) + (s.sharedContribSnehal ?? 0);
      if (combined !== active.initialBalance) {
        updateBudgetMonth(active.id, { initialBalance: combined });
        active.initialBalance = combined;
        setActiveBudgetMonthState({ ...active });
      }
    }

    if (months.length === 0 || !active) {
      setScreenState("month-select");
    } else {
      const should = shouldPromptNewMonth(account);
      if (should) {
        const now = new Date();
        const calMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        setNewMonthPrompt({ show: true, calendarMonth: calMonth });
      }
      setScreenState("dashboard");
    }
  }, [loadMonths]);

  const selectAccount = useCallback((account: AccountType) => {
    setActiveAccount(account);
    updateSettings({ lastSelectedAccount: account });

    if (account === "shared") {
      setPendingAccount(account);
      setPinScreen(isPinSet() ? "verify" : "setup");
      return;
    }

    navigateAfterAuth(account);
  }, [navigateAfterAuth]);

  const onPinSuccess = useCallback(() => {
    setPinScreen("none");
    const account = pendingAccount || "shared";
    setPendingAccount(null);
    navigateAfterAuth(account);
  }, [pendingAccount, navigateAfterAuth]);

  const onPinCancel = useCallback(() => {
    setPinScreen("none");
    setPendingAccount(null);
    setActiveAccount(null);
    setScreenState("landing");
  }, []);

  const createNewBudgetMonth = useCallback(
    (label: string, startDate: string, initialBalance: number) => {
      if (!activeAccount) return;
      const newMonth = createBudgetMonth(activeAccount, label, startDate, initialBalance);
      setActiveBudgetMonthState(newMonth);
      setAllBudgetMonths(getBudgetMonths(activeAccount));
      setTransactions([]);
      setSummary(computeSummary(activeAccount, newMonth.id));
      setScreenState("dashboard");
    },
    [activeAccount]
  );

  const switchBudgetMonth = useCallback(
    (id: string) => {
      if (!activeAccount) return;
      setActiveBudgetMonth(id, activeAccount);
      const { active } = loadMonths(activeAccount);
      setActiveBudgetMonthState(active);
    },
    [activeAccount, loadMonths]
  );

  const updateBudgetMonthBalance = useCallback(
    (id: string, initialBalance: number) => {
      updateBudgetMonth(id, { initialBalance });
      // Update local state to reflect new balance immediately
      setActiveBudgetMonthState(prev => prev ? { ...prev, initialBalance } : prev);
      setAllBudgetMonths(prev => prev.map(m => m.id === id ? { ...m, initialBalance } : m));
      if (activeAccount && activeBudgetMonth) {
        setSummary(computeSummary(activeAccount, activeBudgetMonth.id));
      }
    },
    [activeAccount, activeBudgetMonth]
  );

  const respondToNewMonth = useCallback(
    (decision: "yes" | "no") => {
      if (!activeAccount) return;
      respondToNewMonthPrompt(activeAccount, decision, activeBudgetMonth?.id);
      setNewMonthPrompt({ show: false, calendarMonth: "" });
      if (decision === "yes") {
        setScreenState("month-select");
      }
    },
    [activeAccount, activeBudgetMonth]
  );

  // Transaction helpers
  const addTx = useCallback(
    (data: Omit<Transaction, "id" | "createdAt">) => {
      // Always stamp paidBy on personal transactions
      const personalData = data.accountType === "personal"
        ? { ...data, paidBy: data.paidBy ?? "Adil Sukumar" }
        : data;
      const tx = addTransaction(personalData);
      // Mirror every Personal transaction into Shared automatically
      if (data.accountType === "personal") {
        const sharedMonth = getActiveBudgetMonth("shared");
        if (sharedMonth) {
          addTransaction({
            ...personalData,
            accountType: "shared",
            budgetMonthId: sharedMonth.id,
            paidBy: "Adil Sukumar",
            syncedFromId: tx.id,
          });
        }
      }
      refreshTransactions();
      refreshSummary();
    },
    [refreshTransactions, refreshSummary]
  );

  const updateTx = useCallback(
    (id: string, data: Partial<Transaction>) => {
      updateTransaction(id, data);
      // Only cascade to shared mirror when editing a personal tx (one-way sync)
      const tx = getAllTransactions().find((t) => t.id === id);
      if (tx?.accountType === "personal") {
        const { type, date, amount, description, category, notes, paidBy } = data as Transaction;
        updateTransactionBySyncedFromId(id, { type, date, amount, description, category, notes, paidBy });
      }
      refreshTransactions();
      refreshSummary();
    },
    [refreshTransactions, refreshSummary]
  );

  const deleteTx = useCallback(
    (id: string) => {
      const tx = getAllTransactions().find((t) => t.id === id);
      if (tx?.syncedFromId) {
        // Deleting a shared mirror — only remove this copy, leave personal untouched
        deleteTransaction(id);
      } else {
        // Deleting a personal tx — cascade delete to shared mirrors
        deleteTransaction(id);
        deleteTransactionsBySyncedFromId(id);
      }
      refreshTransactions();
      refreshSummary();
    },
    [refreshTransactions, refreshSummary]
  );

  // IOU helpers
  const addIou = useCallback(
    (data: Omit<IOU, "id" | "createdAt" | "settled">) => {
      addIOU(data);
      refreshIOUs();
    },
    [refreshIOUs]
  );

  const settleIou = useCallback(
    (id: string) => {
      const iou = markIOUSettled(id);

      // Only add settlement tx to the ACTIVE account — no cross-account duplication.
      // Personal→Shared auto-mirror does NOT apply to settlement txs (they are
      // account-specific financial events, not user-entered personal transactions).
      const activeMonth = getActiveBudgetMonth(activeAccount ?? "personal");
      if (activeMonth) {
        addSettlementTransaction(iou, activeAccount ?? "personal", activeMonth.id);
      }

      refreshIOUs();
      refreshTransactions();
      refreshSummary();
    },
    [activeAccount, refreshIOUs, refreshTransactions, refreshSummary]
  );

  const deleteIou = useCallback(
    (id: string) => {
      deleteIOU(id);
      refreshIOUs();
    },
    [refreshIOUs]
  );

  const updateIou = useCallback(
    (id: string, data: Partial<IOU>) => {
      updateIOU(id, data);
      refreshIOUs();
    },
    [refreshIOUs]
  );

  const updateAppSettings = useCallback((data: Partial<ReturnType<typeof getSettings>>) => {
    updateSettings(data);
    // If shared contributions changed, auto-update the active shared month's opening balance
    if (data.sharedContribAdil !== undefined || data.sharedContribSnehal !== undefined) {
      // Read AFTER saving so values are fresh
      const saved = getSettings();
      const combined = (saved.sharedContribAdil ?? 0) + (saved.sharedContribSnehal ?? 0);
      // Always update the shared month regardless of which account is active
      const sharedMonth = getActiveBudgetMonth("shared");
      if (sharedMonth) {
        updateBudgetMonth(sharedMonth.id, { initialBalance: combined });
        // Also update React state if we're currently viewing shared
        if (activeAccount === "shared") {
          setActiveBudgetMonthState(prev => prev ? { ...prev, initialBalance: combined } : prev);
          setAllBudgetMonths(prev => prev.map(m => m.id === sharedMonth.id ? { ...m, initialBalance: combined } : m));
          setSummary(computeSummary("shared", sharedMonth.id));
        }
      }
    }
    setSettingsState(getSettings());
  }, [activeAccount]);

  const exportData = useCallback(() => exportAllData(), []);

  const importDataFromJson = useCallback((json: string) => {
    importData(json);
    if (activeAccount) {
      loadMonths(activeAccount);
      refreshTransactions();
      refreshIOUs();
      refreshSummary();
    }
    setSettingsState(getSettings());
  }, [activeAccount, loadMonths, refreshTransactions, refreshIOUs, refreshSummary]);

  // "I owe them" IOUs = someone physically gave you that money, so it's in your
  // account. Add it to currentBalance only (NOT income — it's a loan, not earnings).
  // When settled later, an expense tx is created and the IOU leaves pending → no double-count.
  const adjustedSummary = useMemo(() => {
    if (!summary) return null;
    const loanCashInHand = ious
      .filter(
        (i) =>
          !i.settled &&
          i.direction === "i_owe_them" &&
          (activeAccount === "shared" || i.accountType === activeAccount)
      )
      .reduce((s, i) => s + i.amount, 0);
    if (loanCashInHand === 0) return summary;
    return { ...summary, currentBalance: summary.currentBalance + loanCashInHand };
  }, [summary, ious, activeAccount]);

  return (
    <AppContext.Provider
      value={{
        screen,
        setScreen,
        pinScreen,
        onPinSuccess,
        onPinCancel,
        activeAccount,
        selectAccount,
        activeBudgetMonth,
        allBudgetMonths,
        createNewBudgetMonth,
        switchBudgetMonth,
        updateBudgetMonthBalance,
        newMonthPrompt,
        respondToNewMonth,
        transactions,
        addTx,
        updateTx,
        deleteTx,
        refreshTransactions,
        ious,
        addIou,
        settleIou,
        deleteIou,
        updateIou,
        refreshIOUs,
        summary: adjustedSummary,
        refreshSummary,
        settings,
        updateAppSettings,
        exportData,
        importDataFromJson,
        currency: settings.currency,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
