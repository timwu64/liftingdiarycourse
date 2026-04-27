"use client";

import { UserButton, useAuth, useClerk } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";

export function SiteHeader() {
  const { isLoaded, isSignedIn } = useAuth();
  const { openSignIn, openSignUp } = useClerk();

  return (
    <header className="flex items-center justify-end gap-3 px-6 py-4">
      <ModeToggle />
      {isLoaded && !isSignedIn && (
        <>
          <Button variant="outline" onClick={() => openSignIn()}>
            Sign in
          </Button>
          <Button onClick={() => openSignUp()}>Sign up</Button>
        </>
      )}
      {isLoaded && isSignedIn && <UserButton />}
    </header>
  );
}
