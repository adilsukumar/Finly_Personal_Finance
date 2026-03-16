import React, { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Card, Button, Input, Label } from "@/components/ui/PremiumComponents";
import { ArrowLeft, Calendar, Play } from "lucide-react";
import { format } from "date-fns";

export default function MonthSelect() {
  const { createNewBudgetMonth, allBudgetMonths, switchBudgetMonth, setScreen, currency, activeAccount, settings, updateAppSettings } = useApp();
  
  const currentMonthName = format(new Date(), "MMMM yyyy");
  const [label, setLabel] = useState(currentMonthName);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [initialBalance, setInitialBalance] = useState("");

  // Shared-only: per-person contributions
  const [contribAdil, setContribAdil] = useState(String(settings.sharedContribAdil || ""));
  const [contribSnehal, setContribSnehal] = useState(String(settings.sharedContribSnehal || ""));

  const isShared = activeAccount === "shared";
  const combinedBalance = (parseFloat(contribAdil) || 0) + (parseFloat(contribSnehal) || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isShared) {
      // Save contributions to settings and use their sum as the opening balance
      updateAppSettings({
        sharedContribAdil: parseFloat(contribAdil) || 0,
        sharedContribSnehal: parseFloat(contribSnehal) || 0,
      });
      createNewBudgetMonth(label, startDate, combinedBalance);
    } else {
      createNewBudgetMonth(label, startDate, parseFloat(initialBalance) || 0);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4 sm:p-8 relative">
      <div className="absolute inset-0 pointer-events-none" style={{background:"radial-gradient(ellipse 70% 60% at 20% 30%, hsl(260 100% 65% / 0.09) 0%, transparent 65%)"}} />
      
      <div className="w-full max-w-md z-10 flex flex-col gap-6 mt-8 sm:mt-16">
        {allBudgetMonths.length > 0 && (
          <Button variant="ghost" onClick={() => setScreen("dashboard")} className="self-start mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        )}

        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Set Up Your Budget Month</h1>
          <p className="text-muted-foreground">Start fresh with a new timeline.</p>
        </div>

        <Card className="border-white/10">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Month Label</Label>
              <Input 
                value={label} 
                onChange={(e) => setLabel(e.target.value)} 
                required
                placeholder="e.g., March 2026"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                required 
              />
            </div>

            {isShared ? (
              <div className="space-y-3">
                <Label>Initial Capital Contributions</Label>
                <div className="space-y-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-primary font-medium">Adil</span>
                    <span className="absolute left-12 top-1/2 -translate-y-1/2 text-muted-foreground">{currency}</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="pl-20"
                      value={contribAdil}
                      onChange={(e) => setContribAdil(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-accent font-medium">Snehal</span>
                    <span className="absolute left-16 top-1/2 -translate-y-1/2 text-muted-foreground">{currency}</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="pl-24"
                      value={contribSnehal}
                      onChange={(e) => setContribSnehal(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                  <span className="text-sm text-muted-foreground">Opening Balance</span>
                  <span className="text-sm font-bold text-primary">{currency}{combinedBalance.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Initial Balance</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">{currency}</span>
                  <Input 
                    type="number" 
                    step="0.01" 
                    className="pl-8" 
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    placeholder="What money do you have right now?"
                    required
                  />
                </div>
              </div>
            )}

            <Button type="submit" className="w-full h-12 text-lg mt-4">
              Start This Month <Play className="w-4 h-4 ml-2 fill-current" />
            </Button>
          </form>
        </Card>

        {allBudgetMonths.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-primary" /> Past Months
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {allBudgetMonths.map((m) => (
                <button
                  key={m.id}
                  onClick={() => switchBudgetMonth(m.id)}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                    m.active 
                      ? "border-primary bg-primary/10 text-white shadow-[0_0_15px_rgba(var(--primary),0.2)]" 
                      : "border-white/10 bg-card hover:bg-white/5 text-muted-foreground hover:text-white"
                  }`}
                >
                  <span className="font-medium">{m.label}</span>
                  <span className="text-sm opacity-80">{format(new Date(m.startDate), "MMM dd, yyyy")}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="z-10 mt-8 pb-4 text-center">
        <p className="text-xs text-white/20 tracking-widest uppercase">Made by Adil Sukumar</p>
      </div>
    </div>
  );
}
