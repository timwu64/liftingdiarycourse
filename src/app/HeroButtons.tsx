"use client";

import { useClerk } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";

export function HeroButtons() {
  const { openSignIn, openSignUp } = useClerk();

  return (
    <div className="flex justify-center gap-3">
      <Button size="lg" onClick={() => openSignUp()}>
        Get started
      </Button>
      <Button variant="outline" size="lg" onClick={() => openSignIn()}>
        Sign in
      </Button>
    </div>
  );
}
