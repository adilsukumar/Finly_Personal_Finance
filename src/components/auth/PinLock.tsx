import React, { useState, useEffect, useCallback } from "react";
import { setupPin, verifyPin, getLockoutRemainingSeconds, getAttemptsRemaining } from "@/lib/storage";
import { Button } from "@/components/ui/PremiumComponents";
import { Delete, ShieldCheck, ShieldAlert, Lock } from "lucide-react";

interface PinLockProps {
  mode: "setup" | "verify";
  onSuccess: () => void;
  onCancel: () => void;
}

type SetupStep = "enter" | "confirm";

export function PinLock({ mode, onSuccess, onCancel }: PinLockProps) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [setupStep, setSetupStep] = useState<SetupStep>("enter");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [checking, setChecking] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(getLockoutRemainingSeconds);
  const [attemptsLeft, setAttemptsLeft] = useState(getAttemptsRemaining);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const t = setInterval(() => {
      const s = getLockoutRemainingSeconds();
      setLockoutSeconds(s);
      if (s <= 0) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [lockoutSeconds]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const activePin = setupStep === "confirm" ? confirmPin : pin;
  const setActivePin = setupStep === "confirm" ? setConfirmPin : setPin;

  const handleDigit = useCallback((d: string) => {
    if (lockoutSeconds > 0 || checking) return;
    setError("");
    setActivePin((prev) => (prev.length < 6 ? prev + d : prev));
  }, [lockoutSeconds, checking, setActivePin]);

  const handleBackspace = useCallback(() => {
    if (lockoutSeconds > 0 || checking) return;
    setError("");
    setActivePin((prev) => prev.slice(0, -1));
  }, [lockoutSeconds, checking, setActivePin]);

  const handleSubmit = useCallback(async () => {
    if (checking) return;

    if (mode === "setup") {
      if (setupStep === "enter") {
        if (pin.length < 6) {
          setError("Enter all 6 digits.");
          triggerShake();
          return;
        }
        setSetupStep("confirm");
        return;
      }
      if (setupStep === "confirm") {
        if (confirmPin.length < 6) {
          setError("Enter all 6 digits to confirm.");
          triggerShake();
          return;
        }
        if (pin !== confirmPin) {
          setError("PINs don't match. Try again.");
          triggerShake();
          setConfirmPin("");
          return;
        }
        setChecking(true);
        await setupPin(pin);
        setChecking(false);
        onSuccess();
        return;
      }
    }

    if (mode === "verify") {
      if (pin.length < 6) {
        setError("Enter all 6 digits.");
        triggerShake();
        return;
      }
      setChecking(true);
      const result = await verifyPin(pin);
      setChecking(false);

      if (result === "correct") {
        onSuccess();
      } else if (result === "locked") {
        setLockoutSeconds(getLockoutRemainingSeconds());
        setError("Too many wrong attempts. Locked.");
        triggerShake();
        setPin("");
      } else {
        const left = getAttemptsRemaining();
        setAttemptsLeft(left);
        setError(left <= 0 ? "Locked for 30 minutes." : `Wrong PIN. ${left} attempt${left === 1 ? "" : "s"} left.`);
        triggerShake();
        setPin("");
      }
    }
  }, [mode, setupStep, pin, confirmPin, checking, onSuccess]);

  useEffect(() => {
    if (activePin.length === 6 && !checking) {
      handleSubmit();
    }
  }, [activePin, checking, handleSubmit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") handleDigit(e.key);
      else if (e.key === "Backspace") handleBackspace();
      else if (e.key === "Enter") handleSubmit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleDigit, handleBackspace, handleSubmit]);

  const formatLockout = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const dots = Array.from({ length: 6 }, (_, i) => i < activePin.length);

  const title =
    mode === "setup"
      ? setupStep === "enter"
        ? "Create a PIN"
        : "Confirm your PIN"
      : "Enter your PIN";

  const subtitle =
    mode === "setup"
      ? setupStep === "enter"
        ? "Set a 6-digit PIN to protect the Shared account"
        : "Enter the same PIN again to confirm"
      : "This account is protected";

  return (
    <div className="fixed inset-0 z-[200] bg-background flex flex-col items-center justify-center p-6">
      <div className="absolute inset-0 pointer-events-none" style={{background:"radial-gradient(ellipse 70% 60% at 20% 30%, hsl(260 100% 65% / 0.09) 0%, transparent 65%), radial-gradient(ellipse 70% 60% at 80% 70%, hsl(190 100% 50% / 0.07) 0%, transparent 65%)"}} />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
            {lockoutSeconds > 0 ? (
              <ShieldAlert className="w-8 h-8 text-destructive" />
            ) : mode === "setup" ? (
              <ShieldCheck className="w-8 h-8 text-primary" />
            ) : (
              <Lock className="w-8 h-8 text-primary" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">{lockoutSeconds > 0 ? "Account Locked" : title}</h2>
          <p className="text-muted-foreground text-sm">
            {lockoutSeconds > 0
              ? `Too many failed attempts. Try again in ${formatLockout(lockoutSeconds)}.`
              : subtitle}
          </p>
          {mode === "setup" && setupStep === "enter" && (
            <p className="text-xs text-accent/70 mt-2">
              PIN is hashed with SHA-256 — never stored in plain text
            </p>
          )}
        </div>

        <div
          className={`flex gap-4 ${shake ? "animate-[shake_0.4s_ease-in-out]" : ""}`}
          style={shake ? { animation: "shake 0.4s ease-in-out" } : {}}
        >
          {dots.map((filled, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                filled
                  ? lockoutSeconds > 0
                    ? "bg-destructive border-destructive"
                    : "bg-primary border-primary shadow-[0_0_8px_var(--color-primary)]"
                  : "border-white/20 bg-transparent"
              }`}
            />
          ))}
        </div>

        {error && !lockoutSeconds && (
          <p className="text-sm text-destructive text-center -mt-4">{error}</p>
        )}

        {!lockoutSeconds && (
          <div className="grid grid-cols-3 gap-3 w-full">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <button
                key={d}
                onClick={() => handleDigit(d)}
                className="h-16 rounded-2xl bg-card/60 border border-white/10 text-white text-xl font-semibold hover:bg-primary/20 hover:border-primary/40 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 ring-primary"
              >
                {d}
              </button>
            ))}
            <button
              onClick={onCancel}
              className="h-16 rounded-2xl bg-card/30 border border-white/5 text-muted-foreground text-sm hover:bg-white/5 active:scale-95 transition-all focus:outline-none"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDigit("0")}
              className="h-16 rounded-2xl bg-card/60 border border-white/10 text-white text-xl font-semibold hover:bg-primary/20 hover:border-primary/40 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 ring-primary"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              className="h-16 rounded-2xl bg-card/30 border border-white/5 text-muted-foreground hover:bg-white/5 active:scale-95 transition-all flex items-center justify-center focus:outline-none"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>
        )}

        {lockoutSeconds > 0 && (
          <Button variant="ghost" onClick={onCancel} className="mt-4">
            Back to Home
          </Button>
        )}

        {mode === "setup" && setupStep === "confirm" && (
          <button
            onClick={() => { setSetupStep("enter"); setConfirmPin(""); setError(""); }}
            className="text-sm text-muted-foreground hover:text-white transition-colors"
          >
            ← Back
          </button>
        )}
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}
