import React, { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { FINANCIAL_QUOTES } from "@/lib/quotes";
import { Card } from "@/components/ui/PremiumComponents";
import { WalletCards, Users } from "lucide-react";

export default function Landing() {
  const { selectAccount, settings } = useApp();

  const [quoteIndex, setQuoteIndex] = useState(() => {
    const dayIndex = Math.floor(Date.now() / 86400000) % FINANCIAL_QUOTES.length;
    return dayIndex;
  });
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setQuoteIndex((prev) => (prev + 1) % FINANCIAL_QUOTES.length);
        setFade(true);
      }, 400);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const quote = FINANCIAL_QUOTES[quoteIndex];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden items-center justify-center p-6">
      {/* Background — CSS gradient only, no filter */}
      <div className="absolute inset-0 pointer-events-none z-0" style={{background:"radial-gradient(ellipse 70% 60% at 20% 30%, hsl(174 100% 39% / 0.12) 0%, transparent 65%), radial-gradient(ellipse 70% 60% at 80% 70%, hsl(163 75% 49% / 0.10) 0%, transparent 65%)"}} />

      <div className="z-10 text-center max-w-3xl w-full flex-1 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center mb-4">
          <img
            src="/logo.png"
            alt="Finly Logo"
            className="w-24 h-24 md:w-32 md:h-32 mb-2 drop-shadow-[0_0_30px_rgba(124,58,237,0.6)]"
          />
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-glow">
            Fin<span className="text-primary">ly</span>
          </h1>
        </div>

        <div className="mb-16 min-h-[120px] flex flex-col items-center justify-center">
          <p
            className="text-xl md:text-2xl font-light italic text-white/80 mb-4 transition-opacity duration-400"
            style={{ opacity: fade ? 1 : 0 }}
          >
            "{quote.text}"
          </p>
          <p
            className="text-sm text-primary font-medium tracking-widest uppercase transition-opacity duration-400"
            style={{ opacity: fade ? 1 : 0 }}
          >
            — {quote.author}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl mx-auto">
          <button
            onClick={() => selectAccount("personal")}
            className="group relative outline-none focus-visible:ring-2 ring-primary rounded-2xl transition-all"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-accent rounded-2xl blur opacity-0 group-hover:opacity-50 transition duration-500" />
            <Card className="relative h-full flex flex-col items-center justify-center p-8 bg-card/80 hover:bg-card border-white/10 hover:border-primary/50 transition-all cursor-pointer">
              <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                <WalletCards className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-white">{settings.personalLabel}</h2>
              <p className="text-muted-foreground text-sm">Your private expense account</p>
            </Card>
          </button>

          <button
            onClick={() => selectAccount("shared")}
            className="group relative outline-none focus-visible:ring-2 ring-accent rounded-2xl transition-all"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-accent to-primary rounded-2xl blur opacity-0 group-hover:opacity-50 transition duration-500" />
            <Card className="relative h-full flex flex-col items-center justify-center p-8 bg-card/80 hover:bg-card border-white/10 hover:border-accent/50 transition-all cursor-pointer">
              <div className="h-16 w-16 rounded-2xl bg-accent/20 flex items-center justify-center mb-6 text-accent group-hover:scale-110 transition-transform">
                <Users className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-white">{settings.sharedLabel}</h2>
              <p className="text-muted-foreground text-sm">Shared expense tracker</p>
            </Card>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="z-10 mt-8 pb-4 text-center">
        <p className="text-xs text-white/20 tracking-widest uppercase">Made by Adil Sukumar</p>
      </div>
    </div>
  );
}
