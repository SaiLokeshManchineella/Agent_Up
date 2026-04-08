'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrainCircuit, LayoutDashboard, Search, User } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { href: '/', label: 'Daily Training', icon: BrainCircuit },
  { href: '/cases', label: 'My Cases', icon: Search },
  { href: '/dashboard', label: 'My Dashboard', icon: LayoutDashboard },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/80 bg-white/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">AgentUp</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'text-primary bg-muted' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <item.icon className="w-4 h-4" strokeWidth={isActive ? 2.5 : 2} />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer border border-border/50">
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>
    </nav>
  );
}
