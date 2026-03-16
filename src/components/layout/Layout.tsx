import React from "react";
import { Sidebar } from "./Sidebar";
import { Menu, ArrowLeftRight, X } from "lucide-react";
import { Button, Card } from "../ui/PremiumComponents";
import { useApp } from "@/contexts/AppContext";

export function Layout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { newMonthPrompt, respondToNewMonth, screen, setScreen } = useApp();

  return (
    <div className="min-h-screen bg-background text-foreground flex relative overflow-hidden">
      {/* Background ambient effects — CSS gradient only, no filter */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{background:"radial-gradient(ellipse 60% 50% at 0% 0%, hsl(174 100% 39% / 0.08) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 100% 100%, hsl(163 75% 49% / 0.06) 0%, transparent 70%)"}} />

      <Sidebar />
      
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b border-white/10 bg-background z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Finly" className="h-7 w-7 rounded-lg" />
          <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            Fin<span className="text-primary font-normal">ly</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setScreen("landing")}>
             <ArrowLeftRight className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-30 bg-background p-4 flex flex-col gap-2">
           {['dashboard', 'transactions', 'analytics', 'ious', 'settings'].map((s) => (
             <Button key={s} variant={screen === s ? "primary" : "ghost"} className="w-full justify-start text-lg h-14 capitalize" onClick={() => { setScreen(s as any); setMobileMenuOpen(false); }}>
               {s}
             </Button>
           ))}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 md:ml-72 flex flex-col relative z-10 min-h-screen pt-16 md:pt-0 overflow-hidden">
        <div className="flex-1 p-4 md:p-8 lg:p-12 w-full max-w-7xl mx-auto overflow-y-auto pb-8">
          {children}
        </div>
        <div className="md:ml-0 py-4 text-center border-t border-white/5">
          <p className="text-xs text-white/20 tracking-widest uppercase">Made by Adil Sukumar</p>
        </div>
      </main>

      {/* New Month Prompt */}
      {newMonthPrompt.show && (
        <div className="fixed inset-0 z-[100] bg-black/75 flex items-center justify-center p-4">
          <Card className="max-w-md w-full animate-in zoom-in-95 fade-in duration-200">
             <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📅</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">New Month!</h3>
                <p className="text-muted-foreground">A new calendar month ({newMonthPrompt.calendarMonth}) has started. Ready to set up your new budget month?</p>
             </div>
             <div className="flex flex-col gap-3">
               <Button onClick={() => respondToNewMonth("yes")} size="lg">
                 Yes, start a new month!
               </Button>
               <Button onClick={() => respondToNewMonth("no")} variant="secondary" size="lg">
                 No, continue current
               </Button>
             </div>
          </Card>
        </div>
      )}
    </div>
  );
}
