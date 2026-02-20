"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

  return (
    <nav className="border-b border-orange-200/50 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
        <Link href="/" className="text-lg font-bold tracking-tight text-orange-900">
          🌴 ChungFamily
        </Link>
        <div className="flex gap-1">
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
      </div>
    </nav>
  );
}
