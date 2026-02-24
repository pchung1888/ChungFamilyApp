"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

interface NavLink {
  href: string;
  label: string;
  emoji: string;
}

const links: NavLink[] = [
  { href: "/", label: "Home", emoji: "🏠" },
  { href: "/family", label: "Family", emoji: "👨‍👩‍👧‍👦" },
  { href: "/cards", label: "Cards", emoji: "💳" },
  { href: "/trips", label: "Trips", emoji: "✈️" },
];

export function Nav(): React.ReactElement {
  const pathname = usePathname();
  const { data: session } = useSession();

  async function handleSignOut(): Promise<void> {
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <nav className="border-b border-orange-200/50 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
        <Link href="/" className="text-lg font-bold tracking-tight text-orange-900">
          🌴 ChungFamily
        </Link>
        <div className="flex flex-1 gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                pathname === link.href
                  ? "bg-orange-100 font-semibold text-orange-800"
                  : "text-orange-700/70 hover:bg-orange-50 hover:text-orange-800"
              }`}
            >
              {link.emoji} {link.label}
            </Link>
          ))}
        </div>
        {session?.user && (
          <div className="flex items-center gap-3">
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name ?? "User avatar"}
                width={28}
                height={28}
                className="rounded-full ring-1 ring-orange-200"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-800 ring-1 ring-orange-200">
                {(session.user.name ?? session.user.email ?? "?")[0].toUpperCase()}
              </div>
            )}
            <span className="hidden text-sm text-orange-800 sm:block">
              {session.user.name ?? session.user.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-orange-700/70 hover:bg-orange-100 hover:text-orange-800"
              onClick={() => void handleSignOut()}
            >
              Sign out
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}
