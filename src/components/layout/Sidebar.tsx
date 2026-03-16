import React from "react";
import { useApp } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";
import { LayoutDashboard, ReceiptText, BarChart3, Settings, WalletCards, Users, ArrowLeftRight, Coins } from "lucide-react";
import { Badge } from "../ui/PremiumComponents";

const navItems = [
  { screen: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { screen: "transactions", label: "Transactions", icon: ReceiptText },
  { screen: "analytics", label: "Analytics", icon: BarChart3 },
  { screen: "ious", label: "IOUs", icon: Coins },
  { screen: "settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const { screen, setScreen, activeAccount, activeBudgetMonth, settings, ious } = useApp();

  const unsettledIouCount = ious.filter(i => !i.settled).length;

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-72 border-r border-white/5 bg-background p-6 hidden flex-col md:flex">
      <div className="flex items-center gap-3 mb-8 px-2 cursor-pointer" onClick={() => setScreen("dashboard")}>
        <img src="/logo.png" alt="Finly" className="h-9 w-9 rounded-xl shrink-0 shadow-[0_0_12px_rgba(124,58,237,0.5)]" />
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 tracking-tight">
          Fin<span className="text-primary font-normal">ly</span>
        </h1>
      </div>

      <div className="mb-8 px-2">
        <div className="rounded-xl border border-white/10 bg-card p-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Account</span>
            <button onClick={() => setScreen("landing")} className="text-xs text-primary hover:text-white transition-colors">
              Switch
            </button>
          </div>
          <div className="flex items-center gap-2 font-medium text-white">
            {activeAccount === "personal" ? <WalletCards className="w-4 h-4 text-primary" /> : <Users className="w-4 h-4 text-accent" />}
            {activeAccount === "personal" ? settings.personalLabel : settings.sharedLabel}
          </div>
          
          <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center">
             <span className="text-xs text-muted-foreground">Month</span>
             <span className="text-sm font-medium text-white truncate max-w-[120px]">{activeBudgetMonth?.label || "None"}</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        <label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-3 px-2 block">
          Menu
        </label>
        {navItems.map((item) => {
          const isActive = screen === item.screen;
          const Icon = item.icon;
          return (
            <button
              key={item.screen}
              onClick={() => setScreen(item.screen as any)}
              className={cn(
                "w-full flex items-center gap-4 rounded-xl px-4 py-3.5 text-sm font-medium transition-all duration-300 relative overflow-hidden group text-left",
                isActive
                  ? "text-primary-foreground bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full shadow-glow-primary" />
              )}
              <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "group-hover:text-foreground")} />
              <span className="flex-1">{item.label}</span>
              
              {item.screen === "ious" && unsettledIouCount > 0 && (
                <Badge variant={isActive ? "default" : "outline"} className="ml-auto">
                  {unsettledIouCount}
                </Badge>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto px-2">
        <button
          onClick={() => setScreen("landing")}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-white/10 text-muted-foreground hover:text-white hover:bg-white/5 transition-all text-sm font-medium"
        >
          <ArrowLeftRight className="w-4 h-4" /> Switch Account
        </button>
      </div>
    </aside>
  );
}
