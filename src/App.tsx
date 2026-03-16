import React from "react";
import { AppProvider, useApp } from "@/contexts/AppContext";
import Landing from "@/pages/Landing";
import MonthSelect from "@/pages/MonthSelect";
import Dashboard from "@/pages/Dashboard";
import Transactions from "@/pages/Transactions";
import Analytics from "@/pages/Analytics";
import IOUs from "@/pages/IOUs";
import Settings from "@/pages/Settings";
import { PinLock } from "@/components/auth/PinLock";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

function AppRouter() {
  const { screen, pinScreen, onPinSuccess, onPinCancel } = useApp();

  if (pinScreen !== "none") {
    return <PinLock mode={pinScreen} onSuccess={onPinSuccess} onCancel={onPinCancel} />;
  }

  if (screen === "landing") return <Landing />;
  if (screen === "month-select") return <MonthSelect />;
  if (screen === "dashboard") return <Dashboard />;
  if (screen === "transactions") return <Transactions />;
  if (screen === "analytics") return <Analytics />;
  if (screen === "ious") return <IOUs />;
  if (screen === "settings") return <Settings />;
  return null;
}

export default function App() {
  return (
    <TooltipProvider>
      <AppProvider>
        <AppRouter />
        <Toaster />
      </AppProvider>
    </TooltipProvider>
  );
}
