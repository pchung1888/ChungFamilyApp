"use client";

import { SessionProvider } from "next-auth/react";

interface SessionProviderWrapperProps {
  children: React.ReactNode;
}

export function SessionProviderWrapper({
  children,
}: SessionProviderWrapperProps): React.ReactElement {
  return <SessionProvider>{children}</SessionProvider>;
}
