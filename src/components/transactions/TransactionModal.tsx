import React, { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { Card, Button, Input, Select, Label } from "@/components/ui/PremiumComponents";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, getCategoryIcon, getCategoryColor } from "@/lib/categories";
import { format } from "date-fns";
import type { Transaction } from "@/lib/storage";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionToEdit?: Transaction | null;
}

export function TransactionModal({ isOpen, onClose, transactionToEdit }: TransactionModalProps) {
  const { addTx, updateTx, activeAccount, activeBudgetMonth, currency } = useApp();

  const [type, setType] = useState<"expense" | "income">("expense");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [paidBy, setPaidBy] = useState("Snehal Dixit");

  useEffect(() => {
    if (isOpen) {
      if (transactionToEdit) {
        setType(transactionToEdit.type);
        setDate(transactionToEdit.date);
        setAmount(transactionToEdit.amount.toString());
        setCategory(transactionToEdit.category);
        setDescription(transactionToEdit.description);
        setNotes(transactionToEdit.notes || "");
        setPaidBy(transactionToEdit.paidBy || (activeAccount === "shared" ? "Snehal Dixit" : "Adil Sukumar"));
      } else {
        setType("expense");
        setDate(format(new Date(), "yyyy-MM-dd"));
        setAmount("");
        setCategory(EXPENSE_CATEGORIES[0]?.id || "");
        setDescription("");
        setNotes("");
        setPaidBy(activeAccount === "shared" ? "Snehal Dixit" : "Adil Sukumar");
      }
    }
  }, [isOpen, transactionToEdit, activeAccount]);

  useEffect(() => {
    if (!transactionToEdit && isOpen) {
      setCategory(type === "expense" ? EXPENSE_CATEGORIES[0]?.id : INCOME_CATEGORIES[0]?.id);
    }
  }, [type, transactionToEdit, isOpen]);

  if (!isOpen || !activeAccount || !activeBudgetMonth) return null;

  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    const txData = {
      accountType: activeAccount,
      budgetMonthId: activeBudgetMonth.id,
      type,
      date,
      amount: numAmount,
      category,
      description,
      notes,
      ...(activeAccount === "shared" ? { paidBy } : {}),
    };

    if (transactionToEdit) {
      updateTx(transactionToEdit.id, txData);
    } else {
      addTx(txData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85">
      <Card className="w-full max-w-lg bg-background border-white/10 animate-in fade-in zoom-in-95 duration-200">
        <h2 className="text-2xl font-bold text-white mb-6">
          {transactionToEdit ? "Edit Transaction" : "Add Transaction"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex bg-black/40 p-1 rounded-xl">
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${type === "expense" ? "bg-destructive/20 text-destructive" : "text-muted-foreground hover:text-white"}`}
              onClick={() => setType("expense")}
            >
              Expense
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${type === "income" ? "bg-success/20 text-success" : "text-muted-foreground hover:text-white"}`}
              onClick={() => setType("income")}
            >
              Income
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">{currency}</span>
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8"
                  required
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="What was this for?" />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)} required className="bg-black/20">
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-background">
                  {c.icon} {c.name}
                </option>
              ))}
            </Select>
          </div>

          {activeAccount === "shared" && (
            <div className="space-y-2">
              <Label>Paid By</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-colors ${paidBy === "Adil Sukumar" ? "border-primary bg-primary/15 text-primary" : "border-white/10 text-muted-foreground hover:text-white"}`}
                  onClick={() => setPaidBy("Adil Sukumar")}
                >
                  Adil Sukumar
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-colors ${paidBy === "Snehal Dixit" ? "border-accent bg-accent/15 text-accent" : "border-white/10 text-muted-foreground hover:text-white"}`}
                  onClick={() => setPaidBy("Snehal Dixit")}
                >
                  Snehal Dixit
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <textarea
              className="flex w-full rounded-xl border border-white/10 bg-input/50 px-4 py-2 text-sm text-foreground shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[80px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {transactionToEdit ? "Save Changes" : "Add Entry"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
