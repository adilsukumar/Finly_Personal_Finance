import React, { useState, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { useApp } from "@/contexts/AppContext";
import { Card, Button, Input, Select, Badge } from "@/components/ui/PremiumComponents";
import { formatCurrency } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import {
  Search, Plus, Filter, Trash2, Edit3, ArrowUpRight, ArrowDownRight,
  Calendar, User, Coins, CheckCircle2, HandCoins, ChevronDown, ChevronUp,
  CheckSquare, Square, SlidersHorizontal, X, LayoutList,
} from "lucide-react";
import { TransactionModal } from "@/components/transactions/TransactionModal";
import { getCategoryIcon, getCategoryColor, ALL_CATEGORIES } from "@/lib/categories";
import type { Transaction } from "@/lib/storage";

export default function Transactions() {
  const {
    transactions, deleteTx, currency, activeBudgetMonth, allBudgetMonths,
    switchBudgetMonth, activeAccount, ious, settleIou,
  } = useApp();

  // ── Global filters ────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // ── Column filters ────────────────────────────────────────────────
  const [colFiltersOpen, setColFiltersOpen] = useState(false);
  const [colDate, setColDate] = useState({ from: "", to: "" });
  const [colDesc, setColDesc] = useState("");
  const [colCategory, setColCategory] = useState("all");
  const [colPaidBy, setColPaidBy] = useState("all");
  const [colAmountMin, setColAmountMin] = useState("");
  const [colAmountMax, setColAmountMax] = useState("");

  const hasColFilters =
    colDate.from || colDate.to || colDesc || colCategory !== "all" ||
    colPaidBy !== "all" || colAmountMin || colAmountMax;

  // ── Selection mode ────────────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── IOU panel ────────────────────────────────────────────────────
  const [iouCollapsed, setIouCollapsed] = useState(false);

  // ── Modal ─────────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const isShared = activeAccount === "shared";

  const resolvedPaidBy = (tx: Transaction) =>
    tx.paidBy || (activeAccount === "personal" ? "Adil Sukumar" : "—");

  // Unique paidBy values for the column filter dropdown
  const uniquePaidBy = useMemo(() => {
    const set = new Set(transactions.map((t) => resolvedPaidBy(t)).filter(Boolean));
    return Array.from(set).sort();
  }, [transactions]);

  // Pending IOUs (both directions)
  const pendingIOUs = ious.filter(
    (i) => !i.settled && (isShared || i.accountType === "personal")
  );
  const iouExpected = pendingIOUs.filter((i) => i.direction === "they_owe_me").reduce((s, i) => s + i.amount, 0);
  const iouOwed = pendingIOUs.filter((i) => i.direction === "i_owe_them").reduce((s, i) => s + i.amount, 0);

  const handleDelete = (txId: string) => {
    const tx = transactions.find((t) => t.id === txId);
    const isSharedMirror = !!tx?.syncedFromId;
    const msg = isSharedMirror
      ? "Delete this transaction from Shared?"
      : activeAccount === "personal"
      ? "Delete this transaction? The matching entry in Shared will also be removed."
      : "Delete this transaction?";
    if (window.confirm(msg)) {
      deleteTx(txId);
    }
  };

  const handleSettleIou = (iou: { id: string; person: string; amount: number; direction: string }) => {
    const msg =
      iou.direction === "they_owe_me"
        ? `Confirm: ${iou.person} paid you back ${currency}${iou.amount.toFixed(2)}? This will add it as income.`
        : `Confirm: You paid ${iou.person} ${currency}${iou.amount.toFixed(2)}? This will record it as an expense.`;
    if (window.confirm(msg)) settleIou(iou.id);
  };

  // ── Filtered transactions ─────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        const term = searchTerm.toLowerCase();
        return (
          !term ||
          tx.description.toLowerCase().includes(term) ||
          ALL_CATEGORIES.find((c) => c.id === tx.category)?.name.toLowerCase().includes(term) ||
          (tx.paidBy || "").toLowerCase().includes(term)
        );
      })
      .filter((tx) => typeFilter === "all" || tx.type === typeFilter)
      // Column filters
      .filter((tx) => !colDesc || tx.description.toLowerCase().includes(colDesc.toLowerCase()))
      .filter((tx) => colCategory === "all" || tx.category === colCategory)
      .filter((tx) => colPaidBy === "all" || resolvedPaidBy(tx) === colPaidBy)
      .filter((tx) => !colDate.from || tx.date >= colDate.from)
      .filter((tx) => !colDate.to || tx.date <= colDate.to)
      .filter((tx) => !colAmountMin || tx.amount >= parseFloat(colAmountMin))
      .filter((tx) => !colAmountMax || tx.amount <= parseFloat(colAmountMax))
      .sort((a, b) => {
        const d = new Date(b.date).getTime() - new Date(a.date).getTime();
        return d !== 0 ? d : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [transactions, searchTerm, typeFilter, colDesc, colCategory, colPaidBy, colDate, colAmountMin, colAmountMax]);

  // ── Selection totals ──────────────────────────────────────────────
  const selectedTxs = filteredTransactions.filter((tx) => selectedIds.has(tx.id));
  const selIncome = selectedTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const selExpense = selectedTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const selNet = selIncome - selExpense;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map((t) => t.id)));
    }
  };

  const openEdit = (tx: Transaction) => { setEditingTx(tx); setIsModalOpen(true); };
  const closeEdit = () => { setEditingTx(null); setIsModalOpen(false); };

  const clearColFilters = () => {
    setColDate({ from: "", to: "" });
    setColDesc("");
    setColCategory("all");
    setColPaidBy("all");
    setColAmountMin("");
    setColAmountMax("");
  };

  return (
    <Layout>
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Transactions</h2>
          <p className="text-muted-foreground mt-1">View and manage all your entries</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          {allBudgetMonths.length > 0 && (
            <Select value={activeBudgetMonth?.id || ""} onChange={(e) => switchBudgetMonth(e.target.value)} className="bg-card w-40">
              {allBudgetMonths.map((m) => (
                <option key={m.id} value={m.id} className="bg-background">{m.label}</option>
              ))}
            </Select>
          )}
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Entry
          </Button>
        </div>
      </div>

      {/* ── Global filters ──────────────────────────────────────── */}
      <Card className="mb-4 bg-card/40">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search description, category, or person..."
              className="pl-10 bg-black/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full md:w-36 bg-black/20">
              <option value="all">All Types</option>
              <option value="expense">Expenses Only</option>
              <option value="income">Income Only</option>
            </Select>

            {/* Column filters toggle */}
            <button
              onClick={() => setColFiltersOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                colFiltersOpen || hasColFilters
                  ? "bg-primary/20 text-primary border-primary/30"
                  : "bg-black/20 text-muted-foreground border-white/5 hover:text-white"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Columns</span>
              {hasColFilters && <span className="w-2 h-2 rounded-full bg-primary ml-1" />}
            </button>

            {/* Selection mode toggle */}
            <button
              onClick={() => { setSelectionMode((v) => !v); setSelectedIds(new Set()); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                selectionMode
                  ? "bg-accent/20 text-accent border-accent/30"
                  : "bg-black/20 text-muted-foreground border-white/5 hover:text-white"
              }`}
            >
              <LayoutList className="w-4 h-4" />
              <span className="hidden sm:inline">Select</span>
            </button>
          </div>
        </div>
      </Card>

      {/* ── Pending IOUs section ─────────────────────────────────── */}
      {pendingIOUs.length > 0 && (
        <div className="mb-4 rounded-2xl border border-dashed border-primary/30 overflow-hidden bg-primary/[0.03]">
          <button
            type="button"
            className="w-full flex items-center gap-3 px-5 py-3 bg-primary/10 hover:bg-primary/15 transition-colors"
            onClick={() => setIouCollapsed((c) => !c)}
          >
            <HandCoins className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-semibold text-primary uppercase tracking-wider flex-1 text-left">Pending IOUs</span>
            {iouExpected > 0 && (
              <span className="text-xs font-semibold text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-full">
                +{currency}{iouExpected.toFixed(2)} owed to me
              </span>
            )}
            {iouOwed > 0 && (
              <span className="text-xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                {currency}{iouOwed.toFixed(2)} I owe
              </span>
            )}
            <span className="text-xs text-muted-foreground ml-2">{pendingIOUs.length}</span>
            {iouCollapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
          </button>

          {!iouCollapsed && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-black/10">
                    <th className="p-3 pl-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Person / Note</th>
                    <th className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Direction</th>
                    {isShared && <th className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account</th>}
                    <th className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Amount</th>
                    <th className="p-3 pr-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {pendingIOUs.map((iou) => {
                    const isIncome = iou.direction === "they_owe_me";
                    return (
                      <tr key={iou.id} className="hover:bg-white/[0.025] transition-colors group">
                        <td className="p-3 pl-5 text-sm text-muted-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 shrink-0" />
                            {format(parseISO(iou.date), "MMM dd, yyyy")}
                          </div>
                        </td>
                        <td className="p-3">
                          <p className="text-sm font-medium text-white">{iou.person}</p>
                          {iou.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{iou.description}</p>}
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            isIncome ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"
                          }`}>
                            <Coins className="w-3 h-3" />
                            {isIncome ? "They Owe Me" : "I Owe Them"}
                          </span>
                        </td>
                        {isShared && (
                          <td className="p-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                              iou.accountType === "personal"
                                ? "bg-primary/10 text-primary border-primary/20"
                                : "bg-accent/10 text-accent border-accent/20"
                            }`}>
                              {iou.accountType === "personal" ? "Personal" : "Shared"}
                            </span>
                          </td>
                        )}
                        <td className="p-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {isIncome ? <ArrowDownRight className="w-3 h-3 text-success" /> : <ArrowUpRight className="w-3 h-3 text-destructive" />}
                            <span className={`text-sm font-bold ${isIncome ? "text-success" : "text-destructive"}`}>
                              {isIncome ? "+" : "-"}{currency}{iou.amount.toFixed(2)}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 pr-5 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs px-2.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-success/10 hover:text-success border border-transparent hover:border-success/20"
                            onClick={() => handleSettleIou(iou)}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Settle
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Main Transactions Table ──────────────────────────────── */}
      <Card className="p-0 overflow-hidden border-white/5">
        {filteredTransactions.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground flex flex-col items-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-white/20" />
            </div>
            <p className="text-lg font-medium text-white mb-1">No transactions found</p>
            <p className="text-sm">Try adjusting your filters or add a new entry.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                {/* ── Main header row ── */}
                <tr className="border-b border-white/5 bg-black/20">
                  {/* Select-all checkbox */}
                  {selectionMode && (
                    <th className="p-4 w-10">
                      <button onClick={toggleSelectAll} className="text-muted-foreground hover:text-white transition-colors">
                        {selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0
                          ? <CheckSquare className="w-4 h-4 text-primary" />
                          : <Square className="w-4 h-4" />}
                      </button>
                    </th>
                  )}
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <div className="flex items-center gap-1">Date</div>
                  </th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paid By</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Amount</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                </tr>

                {/* ── Column filter row ── */}
                {colFiltersOpen && (
                  <tr className="border-b border-white/5 bg-primary/[0.04]">
                    {selectionMode && <td />}
                    {/* Date from/to */}
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-1">
                        <input
                          type="date"
                          value={colDate.from}
                          onChange={(e) => setColDate((d) => ({ ...d, from: e.target.value }))}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white [color-scheme:dark]"
                          placeholder="From"
                        />
                        <input
                          type="date"
                          value={colDate.to}
                          onChange={(e) => setColDate((d) => ({ ...d, to: e.target.value }))}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white [color-scheme:dark]"
                          placeholder="To"
                        />
                      </div>
                    </td>
                    {/* Description */}
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={colDesc}
                        onChange={(e) => setColDesc(e.target.value)}
                        placeholder="Filter description…"
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder:text-muted-foreground"
                      />
                    </td>
                    {/* Category */}
                    <td className="px-3 py-2">
                      <select
                        value={colCategory}
                        onChange={(e) => setColCategory(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                      >
                        <option value="all">All categories</option>
                        {ALL_CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </td>
                    {/* Paid By */}
                    <td className="px-3 py-2">
                      <select
                        value={colPaidBy}
                        onChange={(e) => setColPaidBy(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                      >
                        <option value="all">All people</option>
                        {uniquePaidBy.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </td>
                    {/* Amount min/max */}
                    <td className="px-3 py-2">
                      <div className="flex gap-1 items-center justify-end">
                        <input
                          type="number"
                          value={colAmountMin}
                          onChange={(e) => setColAmountMin(e.target.value)}
                          placeholder="Min"
                          className="w-16 bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder:text-muted-foreground text-right"
                        />
                        <span className="text-muted-foreground text-xs">–</span>
                        <input
                          type="number"
                          value={colAmountMax}
                          onChange={(e) => setColAmountMax(e.target.value)}
                          placeholder="Max"
                          className="w-16 bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder:text-muted-foreground text-right"
                        />
                      </div>
                    </td>
                    {/* Clear filters */}
                    <td className="px-3 py-2 text-right">
                      {hasColFilters && (
                        <button
                          onClick={clearColFilters}
                          className="inline-flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors"
                        >
                          <X className="w-3 h-3" /> Clear
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </thead>

              <tbody className="divide-y divide-white/5">
                {filteredTransactions.map((tx) => {
                  const catColor = getCategoryColor(tx.category);
                  const catIcon = getCategoryIcon(tx.category);
                  const catName = ALL_CATEGORIES.find((c) => c.id === tx.category)?.name || tx.category;
                  const displayPaidBy = resolvedPaidBy(tx);
                  const paidByAdil = displayPaidBy === "Adil Sukumar";
                  const paidByBoth = displayPaidBy.includes("&");
                  const isSelected = selectedIds.has(tx.id);

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-white/[0.02] transition-colors group cursor-pointer ${isSelected ? "bg-primary/[0.06]" : ""}`}
                      onDoubleClick={() => !selectionMode && openEdit(tx)}
                      onClick={() => selectionMode && toggleSelect(tx.id)}
                    >
                      {selectionMode && (
                        <td className="p-4 w-10">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleSelect(tx.id); }}
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            {isSelected
                              ? <CheckSquare className="w-4 h-4 text-primary" />
                              : <Square className="w-4 h-4" />}
                          </button>
                        </td>
                      )}
                      <td className="p-4 text-sm text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          {format(parseISO(tx.date), "MMM dd, yyyy")}
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-medium text-white">{tx.description}</p>
                        {tx.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{tx.notes}</p>}
                        {tx.syncedFromId && <p className="text-xs text-primary/60 mt-0.5">↗ synced from personal</p>}
                      </td>
                      <td className="p-4">
                        <div
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-black/30 border border-white/5"
                          style={{ color: catColor }}
                        >
                          <span>{catIcon}</span>
                          <span>{catName}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          paidByBoth
                            ? "bg-primary/10 text-muted-foreground border border-white/10"
                            : paidByAdil
                            ? "bg-primary/15 text-primary border border-primary/20"
                            : "bg-accent/15 text-accent border border-accent/20"
                        }`}>
                          <User className="w-3 h-3" />
                          {displayPaidBy}
                        </div>
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {tx.type === "expense"
                            ? <ArrowUpRight className="w-3 h-3 text-destructive" />
                            : <ArrowDownRight className="w-3 h-3 text-success" />}
                          <span className={`text-sm font-bold ${tx.type === "expense" ? "text-destructive" : "text-success"}`}>
                            {tx.type === "expense" ? "-" : "+"}
                            {formatCurrency(tx.amount).replace("₹", currency)}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10"
                            onClick={(e) => { e.stopPropagation(); openEdit(tx); }}
                          >
                            <Edit3 className="w-4 h-4 text-muted-foreground hover:text-white" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/20"
                            onClick={(e) => { e.stopPropagation(); handleDelete(tx.id); }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Selection summary floating bar ──────────────────────── */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-3 rounded-2xl bg-background/95 border border-white/10 shadow-2xl shadow-black/60 backdrop-blur-sm">
          <span className="text-xs text-muted-foreground font-medium">
            {selectedIds.size} selected
          </span>
          <div className="w-px h-5 bg-white/10" />
          {selIncome > 0 && (
            <div className="flex items-center gap-1.5">
              <ArrowDownRight className="w-3.5 h-3.5 text-success" />
              <span className="text-sm font-bold text-success">+{currency}{selIncome.toFixed(2)}</span>
              <span className="text-xs text-muted-foreground">income</span>
            </div>
          )}
          {selIncome > 0 && selExpense > 0 && <div className="w-px h-5 bg-white/10" />}
          {selExpense > 0 && (
            <div className="flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-destructive" />
              <span className="text-sm font-bold text-destructive">-{currency}{selExpense.toFixed(2)}</span>
              <span className="text-xs text-muted-foreground">expense</span>
            </div>
          )}
          {selIncome > 0 && selExpense > 0 && (
            <>
              <div className="w-px h-5 bg-white/10" />
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Net</span>
                <span className={`text-sm font-bold ${selNet >= 0 ? "text-success" : "text-destructive"}`}>
                  {selNet >= 0 ? "+" : ""}{currency}{selNet.toFixed(2)}
                </span>
              </div>
            </>
          )}
          <div className="w-px h-5 bg-white/10" />
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-muted-foreground hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <TransactionModal isOpen={isModalOpen} onClose={closeEdit} transactionToEdit={editingTx} />
    </Layout>
  );
}
