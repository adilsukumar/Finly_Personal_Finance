import React, { useState, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { useApp } from "@/contexts/AppContext";
import { Card, Button, Input, Label, Select } from "@/components/ui/PremiumComponents";
import { Download, Upload, Trash2, Save, ShieldAlert, KeyRound, ShieldCheck, Wallet, CheckCircle2, Users, TrendingUp, TrendingDown, Plus } from "lucide-react";
import { isPinSet, resetPin } from "@/lib/storage";

export default function Settings() {
  const { settings, updateAppSettings, activeAccount, allBudgetMonths, activeBudgetMonth, exportData, importDataFromJson, switchBudgetMonth, updateBudgetMonthBalance, transactions, setScreen } = useApp();

  const [personalLabel, setPersonalLabel] = useState(settings.personalLabel);
  const [sharedLabel, setSharedLabel] = useState(settings.sharedLabel);
  const [currency, setCurrency] = useState(settings.currency);
  const [isSuccess, setIsSuccess] = useState(false);

  const [editingBalance, setEditingBalance] = useState(false);
  const [newBalance, setNewBalance] = useState(activeBudgetMonth?.initialBalance?.toString() ?? "0");
  const [balanceSaved, setBalanceSaved] = useState(false);

  const [pinStatus, setPinStatus] = useState<"idle" | "reset-success">("idle");
  const [pinIsSet, setPinIsSet] = useState(isPinSet);

  const isShared = activeAccount === "shared";

  const [contribAdil, setContribAdil] = useState(String(settings.sharedContribAdil ?? 0));
  const [contribSnehal, setContribSnehal] = useState(String(settings.sharedContribSnehal ?? 0));
  const [contribSaved, setContribSaved] = useState(false);

  const perPersonData = useMemo(() => {
    if (!isShared) return null;
    const adil = { income: 0, expenses: 0 };
    const snehal = { income: 0, expenses: 0 };
    transactions.forEach((tx) => {
      const p = tx.paidBy ?? "";
      const isBoth = p.includes("&");
      const isAdil = !isBoth && (p === "Adil Sukumar" || p === "");
      const isSnehal = !isBoth && p === "Snehal Dixit";
      if (tx.type === "expense") {
        if (isBoth) { adil.expenses += tx.amount / 2; snehal.expenses += tx.amount / 2; }
        else if (isAdil) adil.expenses += tx.amount;
        else if (isSnehal) snehal.expenses += tx.amount;
        else adil.expenses += tx.amount;
      } else if (tx.type === "income") {
        if (isBoth) { adil.income += tx.amount / 2; snehal.income += tx.amount / 2; }
        else if (isAdil) adil.income += tx.amount;
        else if (isSnehal) snehal.income += tx.amount;
        else adil.income += tx.amount;
      }
    });
    return { adil, snehal };
  }, [isShared, transactions]);

  const handleSaveContrib = (e: React.FormEvent) => {
    e.preventDefault();
    const a = parseFloat(contribAdil) || 0;
    const s = parseFloat(contribSnehal) || 0;
    updateAppSettings({ sharedContribAdil: a, sharedContribSnehal: s });
    setContribSaved(true);
    setTimeout(() => setContribSaved(false), 3000);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateAppSettings({ personalLabel, sharedLabel, currency });
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 3000);
  };

  const handleSaveBalance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBudgetMonth) return;
    const val = parseFloat(newBalance);
    if (isNaN(val) || val < 0) return;
    updateBudgetMonthBalance(activeBudgetMonth.id, val);
    setEditingBalance(false);
    setBalanceSaved(true);
    setTimeout(() => setBalanceSaved(false), 3000);
  };

  const handleResetPin = () => {
    if (window.confirm("Reset the Shared account PIN? Anyone will be able to set a new one on next login.")) {
      resetPin();
      setPinIsSet(false);
      setPinStatus("reset-success");
      setTimeout(() => setPinStatus("idle"), 3000);
    }
  };

  const handleExport = () => {
    const dataStr = exportData();
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = `finly-backup-${new Date().toISOString().split("T")[0]}.json`;
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (window.confirm("Warning: Importing data will completely overwrite your existing data. Proceed?")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = event.target?.result as string;
          importDataFromJson(json);
          alert("Data imported successfully! App will reload.");
          window.location.reload();
        } catch {
          alert("Error importing file. Invalid format.");
        }
      };
      reader.readAsText(file);
    }
    e.target.value = "";
  };

  const handleClearData = () => {
    if (window.confirm("CRITICAL WARNING: This will delete ALL your transactions, IOUs, and settings permanently. There is no undo. Are you absolutely sure?")) {
      if (window.confirm("Are you REALLY sure?")) {
        localStorage.clear();
        window.location.reload();
      }
    }
  };

  return (
    <Layout>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-1">Configure your app preferences and manage data</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* App Preferences */}
        <Card className="border-white/10">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-white">App Preferences</h3>
            <p className="text-sm text-muted-foreground mt-1">Customize labels and currency</p>
          </div>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="space-y-2">
              <Label>Personal Account Label</Label>
              <Input value={personalLabel} onChange={(e) => setPersonalLabel(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Shared Account Label</Label>
              <Input value={sharedLabel} onChange={(e) => setSharedLabel(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Currency Symbol</Label>
              <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="₹">₹ (INR)</option>
                <option value="$">$ (USD)</option>
                <option value="€">€ (EUR)</option>
                <option value="£">£ (GBP)</option>
              </Select>
            </div>
            <div className="flex items-center gap-4 pt-2">
              <Button type="submit">
                <Save className="w-4 h-4 mr-2" /> Save Settings
              </Button>
              {isSuccess && <span className="text-sm text-success animate-in fade-in">Saved successfully!</span>}
            </div>
          </form>
        </Card>

        {/* Budget Month Management */}
        <Card className="border-white/10">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-white">Budget Months</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Manage timeline periods for {activeAccount === "personal" ? "Personal" : "Shared"} account
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Switch Active Month</Label>
              <Select
                value={activeBudgetMonth?.id || ""}
                onChange={(e) => switchBudgetMonth(e.target.value)}
                className="bg-black/20"
              >
                {allBudgetMonths.length === 0 && <option value="">No months available</option>}
                {allBudgetMonths.map((m) => (
                  <option key={m.id} value={m.id} className="bg-background">
                    {m.label} {m.active ? "(Active)" : ""}
                  </option>
                ))}
              </Select>
            </div>

            {/* Create New Month */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setScreen("month-select")}
            >
              <Plus className="w-4 h-4 mr-2" /> Create New Month
            </Button>

            {/* Edit Initial Balance */}
            {activeBudgetMonth && (
              <div className="mt-2 p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-primary" />
                      Opening Balance
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{activeBudgetMonth.label}</p>
                  </div>
                  {!editingBalance && (
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">
                        {settings.currency}{activeBudgetMonth.initialBalance.toFixed(2)}
                      </p>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-white underline underline-offset-2 mt-0.5"
                        onClick={() => {
                          setNewBalance(activeBudgetMonth.initialBalance.toString());
                          setEditingBalance(true);
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>

                {editingBalance && (
                  <form onSubmit={handleSaveBalance} className="flex items-end gap-3">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">New Opening Balance</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{settings.currency}</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={newBalance}
                          onChange={(e) => setNewBalance(e.target.value)}
                          className="pl-8"
                          required
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setEditingBalance(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" size="sm">
                        <Save className="w-3 h-3 mr-1" /> Save
                      </Button>
                    </div>
                  </form>
                )}

                {balanceSaved && (
                  <p className="text-xs text-success flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Opening balance updated!
                  </p>
                )}
              </div>
            )}

            <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
              <p className="text-sm text-white font-medium mb-1">How Budget Months Work</p>
              <p className="text-xs text-primary/80 leading-relaxed">
                Instead of strictly calendar months, Finly lets you define custom budget periods (e.g. "Salary to Salary").
                All dashboard stats and transactions are scoped to your active budget month.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Shared Account — Per-Person Breakdown */}
      {isShared && perPersonData && (
        <Card className="border-primary/20 mb-8">
          <div className="mb-5">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Shared Account Breakdown
            </h3>
            <p className="text-sm text-muted-foreground mt-1">Initial capital contributions and current balances per person</p>
          </div>

          {/* Initial contributions */}
          <form onSubmit={handleSaveContrib} className="mb-5">
            <p className="text-sm font-medium text-white mb-3">Initial Capital Contributions</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
              <div className="space-y-1">
                <Label className="text-primary text-xs">Adil Sukumar</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{settings.currency}</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={contribAdil}
                    onChange={e => setContribAdil(e.target.value)}
                    className="pl-8"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-accent text-xs">Snehal Dixit</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{settings.currency}</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={contribSnehal}
                    onChange={e => setContribSnehal(e.target.value)}
                    className="pl-8"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" size="sm"><Save className="w-3 h-3 mr-1.5" /> Save</Button>
              {contribSaved && <span className="text-xs text-success">Saved!</span>}
            </div>
          </form>

          {/* Per-person income / expenses / balance summary */}
          <div className="border-t border-white/5 pt-4">
            <p className="text-sm font-medium text-white mb-3">Current Month Summary</p>
            <div className="grid grid-cols-3 gap-3">
              {/* Headers */}
              <div />
              <div className="text-center text-xs font-semibold text-primary uppercase tracking-wider">Adil</div>
              <div className="text-center text-xs font-semibold text-accent uppercase tracking-wider">Snehal</div>

              {/* Capital row */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                <Wallet className="w-3 h-3" /> Capital
              </div>
              <div className="p-2 text-center rounded-lg bg-primary/5 border border-primary/15">
                <span className="text-xs font-bold text-primary">{settings.currency}{(parseFloat(contribAdil) || 0).toFixed(2)}</span>
              </div>
              <div className="p-2 text-center rounded-lg bg-accent/5 border border-accent/15">
                <span className="text-xs font-bold text-accent">{settings.currency}{(parseFloat(contribSnehal) || 0).toFixed(2)}</span>
              </div>

              {/* Income row */}
              <div className="flex items-center gap-1 text-xs text-success font-medium">
                <TrendingUp className="w-3 h-3" /> Income
              </div>
              <div className="p-2 text-center rounded-lg bg-success/5 border border-success/15">
                <span className="text-xs font-bold text-success">{settings.currency}{perPersonData.adil.income.toFixed(2)}</span>
              </div>
              <div className="p-2 text-center rounded-lg bg-success/5 border border-success/15">
                <span className="text-xs font-bold text-success">{settings.currency}{perPersonData.snehal.income.toFixed(2)}</span>
              </div>

              {/* Expenses row */}
              <div className="flex items-center gap-1 text-xs text-destructive font-medium">
                <TrendingDown className="w-3 h-3" /> Spent
              </div>
              <div className="p-2 text-center rounded-lg bg-destructive/5 border border-destructive/15">
                <span className="text-xs font-bold text-destructive">{settings.currency}{perPersonData.adil.expenses.toFixed(2)}</span>
              </div>
              <div className="p-2 text-center rounded-lg bg-destructive/5 border border-destructive/15">
                <span className="text-xs font-bold text-destructive">{settings.currency}{perPersonData.snehal.expenses.toFixed(2)}</span>
              </div>

              {/* Current balance row */}
              {(() => {
                const adilBal = (parseFloat(contribAdil) || 0) + perPersonData.adil.income - perPersonData.adil.expenses;
                const snehalBal = (parseFloat(contribSnehal) || 0) + perPersonData.snehal.income - perPersonData.snehal.expenses;
                const adilPos = adilBal >= 0;
                const snehalPos = snehalBal >= 0;
                return (
                  <>
                    <div className="flex items-center gap-1 text-xs text-white/70 font-semibold">
                      <Wallet className="w-3 h-3" /> Balance
                    </div>
                    <div className={`p-2 text-center rounded-lg border ${adilPos ? "bg-primary/10 border-primary/25" : "bg-destructive/10 border-destructive/25"}`}>
                      <span className={`text-xs font-bold ${adilPos ? "text-primary" : "text-destructive"}`}>
                        {adilPos ? "+" : "-"}{settings.currency}{Math.abs(adilBal).toFixed(2)}
                      </span>
                    </div>
                    <div className={`p-2 text-center rounded-lg border ${snehalPos ? "bg-accent/10 border-accent/25" : "bg-destructive/10 border-destructive/25"}`}>
                      <span className={`text-xs font-bold ${snehalPos ? "text-accent" : "text-destructive"}`}>
                        {snehalPos ? "+" : "-"}{settings.currency}{Math.abs(snehalBal).toFixed(2)}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </Card>
      )}

      {/* Shared Account PIN */}
      <Card className="border-primary/20 mb-8">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" /> Shared Account PIN
          </h3>
          <p className="text-sm text-muted-foreground mt-1">The Shared account is protected by a 6-digit PIN hashed with PBKDF2.</p>
        </div>
        <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${pinIsSet ? "bg-success/20" : "bg-muted/20"}`}>
            <ShieldCheck className={`w-5 h-5 ${pinIsSet ? "text-success" : "text-muted-foreground"}`} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">
              {pinIsSet ? "PIN is active" : "No PIN set — will prompt on first access"}
            </p>
            <p className="text-xs text-muted-foreground">
              {pinIsSet ? "Locks after 5 wrong attempts for 30 minutes" : "PIN will be created when Shared account is first accessed"}
            </p>
          </div>
          {pinIsSet && (
            <Button variant="destructive" size="sm" onClick={handleResetPin}>
              Reset PIN
            </Button>
          )}
        </div>
        {pinStatus === "reset-success" && (
          <p className="text-sm text-success mt-3">PIN reset. A new PIN will be set on next Shared login.</p>
        )}
      </Card>

      {/* Data Management */}
      <Card className="border-destructive/20 relative overflow-hidden bg-background">
        <div className="absolute top-0 left-0 w-1 h-full bg-destructive" />
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-destructive" /> Data Management
          </h3>
          <p className="text-sm text-muted-foreground mt-1">Your data is stored 100% locally on your device. Backup regularly.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-white/5 rounded-xl bg-white/[0.02]">
            <h4 className="font-medium text-white mb-2">Export Backup</h4>
            <p className="text-xs text-muted-foreground mb-4">Download a JSON file containing all your data.</p>
            <Button variant="outline" className="w-full" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" /> Export JSON
            </Button>
          </div>
          <div className="p-4 border border-white/5 rounded-xl bg-white/[0.02]">
            <h4 className="font-medium text-white mb-2">Import Data</h4>
            <p className="text-xs text-muted-foreground mb-4">Restore from a JSON backup. Overwrites everything.</p>
            <div className="relative">
              <Input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <Button variant="outline" className="w-full pointer-events-none">
                <Upload className="w-4 h-4 mr-2" /> Select File
              </Button>
            </div>
          </div>
          <div className="p-4 border border-destructive/20 rounded-xl bg-destructive/5">
            <h4 className="font-medium text-white mb-2">Factory Reset</h4>
            <p className="text-xs text-muted-foreground mb-4 text-destructive/80">Delete everything permanently. Cannot be undone.</p>
            <Button variant="destructive" className="w-full" onClick={handleClearData}>
              <Trash2 className="w-4 h-4 mr-2" /> Clear All Data
            </Button>
          </div>
        </div>
      </Card>
    </Layout>
  );
}
