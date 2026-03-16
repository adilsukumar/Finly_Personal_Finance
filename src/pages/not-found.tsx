import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/PremiumComponents";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-6">
        <h1 className="text-9xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-primary to-accent opacity-50">404</h1>
        <h2 className="text-2xl font-semibold text-white">Lost in the void</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link href="/">
          <Button variant="primary" className="mt-4">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
