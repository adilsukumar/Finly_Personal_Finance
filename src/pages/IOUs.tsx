import React, { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useApp } from "@/contexts/AppContext";
import { Card, Button, Input, Select, Label, Badge } from "@/components/ui/PremiumComponents";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { Coins, Plus, Trash2, CheckCircle2, UserCircle, ArrowRightLeft, Edit3, Smartphone } from "lucide-react";
import type { IOU } from "@/lib/storage";

export default function IOUs() {
  const { ious, addIou, settleIou, deleteIou, updateIou, currency, activeAccount } = useApp();
  const isSharedView = activeAccount === "shared";

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIOU, setEditingIOU] = useState<IOU | null>(null);

  const [person, setPerson] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [direction, setDirection] = useState<"they_owe_me" | "i_owe_them">("they_owe_me");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paidBy, setPaidBy] = useState("Adil Sukumar");

  const pendingIOUs = ious.filter(i => !i.settled);
  const settledIOUs = ious.filter(i => i.settled);
  const theyOweMe = pendingIOUs.filter(i => i.direction === "they_owe_me");
  const iOweThem = pendingIOUs.filter(i => i.direction === "i_owe_them");

  const openAdd = () => {
    setEditingIOU(null);
    setPerson("");
    setAmount("");
    setDescription("");
    setDirection("they_owe_me");
    setDate(format(new Date(), "yyyy-MM-dd"));
    setPaidBy("Adil Sukumar");
    setIsModalOpen(true);
  };

  const openEdit = (iou: IOU) => {
    setEditingIOU(iou);
    setPerson(iou.person);
    setAmount(iou.amount.toString());
    setDescription(iou.description || "");
    setDirection(iou.direction);
    setDate(iou.date);
    setPaidBy(iou.paidBy || "Adil Sukumar");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingIOU(null);
  };

  const handleSettle = (id: string, person: string, amt: number, dir: string) => {
    const msg = dir === "they_owe_me"
      ? `Confirm: ${person} paid you back ${currency}${amt}? This will add it as INCOME to your current budget month.`
      : `Confirm: You paid ${person} back ${currency}${amt}? This will add it as an EXPENSE to your current budget month.`;
    if (window.confirm(msg)) settleIou(id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(amount);
    if (!person || isNaN(numAmt) || numAmt <= 0) return;

    const resolvedPaidBy = isSharedView ? paidBy : "Adil Sukumar";

    if (editingIOU) {
      updateIou(editingIOU.id, { person, amount: numAmt, description, direction, date, paidBy: resolvedPaidBy });
    } else {
      addIou({ accountType: activeAccount || "personal", person, amount: numAmt, description, direction, date, paidBy: resolvedPaidBy });
    }
    closeModal();
  };

  const renderIOUCard = (iou: IOU) => (
    <Card key={iou.id} className={`p-5 relative overflow-hidden group ${iou.settled ? "opacity-60 grayscale" : ""}`}>
      {!iou.settled && (
        <div className={`absolute top-0 left-0 w-1 h-full ${iou.direction === "they_owe_me" ? "bg-success" : "bg-destructive"}`} />
      )}

      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center">
            <UserCircle className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <h4 className={`text-lg font-bold ${iou.settled ? "line-through text-muted-foreground" : "text-white"}`}>
              {iou.person}
            </h4>
            <p className="text-xs text-muted-foreground">{format(new Date(iou.date), "MMM dd, yyyy")}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-xl font-bold tracking-tight ${
            iou.settled ? "text-muted-foreground" : iou.direction === "they_owe_me" ? "text-success" : "text-destructive"
          }`}>
            {formatCurrency(iou.amount).replace("₹", currency)}
          </p>
          {iou.settled && <Badge variant="outline" className="mt-1 bg-black/40">Settled</Badge>}
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4 bg-black/20 p-2 rounded-lg line-clamp-2">
        {iou.description || "No description"}
      </p>

      <div className="flex justify-between items-center pt-2 border-t border-white/5">
        {!iou.settled ? (
          <Button
            size="sm"
            variant="outline"
            className="hover:border-success hover:text-success hover:bg-success/10 transition-colors"
            onClick={() => handleSettle(iou.id, iou.person, iou.amount, iou.direction)}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Settled
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">
            Settled on {iou.settledAt ? format(new Date(iou.settledAt), "MMM dd") : "Unknown"}
          </span>
        )}

        <div className="flex items-center gap-2">
          {isSharedView && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-primary/15 text-primary border border-primary/25">
              <Smartphone className="w-2.5 h-2.5" />
              {iou.paidBy || (iou.accountType === "personal" ? "Adil Sukumar" : "Shared")}
            </span>
          )}
          {!iou.settled && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
              onClick={() => openEdit(iou)}
            >
              <Edit3 className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/20"
            onClick={() => { if (window.confirm("Delete this IOU record forever?")) deleteIou(iou.id); }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">IOUs & Debts</h2>
          <p className="text-muted-foreground mt-1">Track money you owe or are owed</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4 mr-2" /> Add IOU
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-success/20">
            <Coins className="text-success w-5 h-5" />
            <h3 className="text-xl font-semibold text-white">They Owe Me</h3>
            <Badge variant="success" className="ml-auto">{theyOweMe.length}</Badge>
          </div>
          {theyOweMe.length === 0 ? (
            <div className="p-8 text-center bg-card/30 rounded-2xl border border-dashed border-white/10 text-muted-foreground">
              No one owes you money!
            </div>
          ) : (
            theyOweMe.map(renderIOUCard)
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-destructive/20">
            <ArrowRightLeft className="text-destructive w-5 h-5" />
            <h3 className="text-xl font-semibold text-white">I Owe Them</h3>
            <Badge variant="destructive" className="ml-auto">{iOweThem.length}</Badge>
          </div>
          {iOweThem.length === 0 ? (
            <div className="p-8 text-center bg-card/30 rounded-2xl border border-dashed border-white/10 text-muted-foreground">
              You are debt-free!
            </div>
          ) : (
            iOweThem.map(renderIOUCard)
          )}
        </div>
      </div>

      {settledIOUs.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-muted-foreground mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Settled History
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-70">
            {settledIOUs.map(renderIOUCard)}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85">
          <Card className="w-full max-w-md bg-background border-white/10 animate-in fade-in zoom-in-95">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingIOU ? "Edit IOU" : "Add New IOU"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex bg-black/40 p-1 rounded-xl mb-6">
                <button
                  type="button"
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${direction === "they_owe_me" ? "bg-success/20 text-success" : "text-muted-foreground hover:text-white"}`}
                  onClick={() => setDirection("they_owe_me")}
                >
                  They owe me
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${direction === "i_owe_them" ? "bg-destructive/20 text-destructive" : "text-muted-foreground hover:text-white"}`}
                  onClick={() => setDirection("i_owe_them")}
                >
                  I owe them
                </button>
              </div>

              <div className="space-y-2">
                <Label>Person's Name</Label>
                <Input value={person} onChange={e => setPerson(e.target.value)} placeholder="e.g., John Doe" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">{currency}</span>
                    <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="pl-8" required placeholder="0.00" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="What was this for?" />
              </div>

              {isSharedView && (
                <div className="space-y-2">
                  <Label>Recorded by</Label>
                  <div className="flex bg-black/40 p-1 rounded-xl">
                    {["Adil Sukumar", "Snehal Dixit"].map((name) => (
                      <button
                        key={name}
                        type="button"
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                          paidBy === name
                            ? "bg-primary/20 text-primary"
                            : "text-muted-foreground hover:text-white"
                        }`}
                        onClick={() => setPaidBy(name)}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="ghost" className="flex-1" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" variant={direction === "they_owe_me" ? "primary" : "destructive"}>
                  {editingIOU ? "Save Changes" : "Save IOU"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </Layout>
  );
}
