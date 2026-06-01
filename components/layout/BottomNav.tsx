"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Gift, BarChart2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function BottomNav() {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { label: "Home", href: "/dashboard", icon: Home },
    { label: "Rewards", href: "/rewards", icon: Gift },
    { label: "Analytics", href: "/analytics", icon: BarChart2 },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <nav className="bottom-nav flex items-center justify-around h-16 px-2 shadow-lg border-t border-white/[0.06] bg-black/80 backdrop-blur-lg">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative flex flex-col items-center justify-center flex-1 h-full py-1 text-xs transition-colors duration-200"
          >
            <div
              className={cn(
                "flex flex-col items-center gap-0.5 justify-center transition-all duration-200",
                isActive ? "text-primary scale-110" : "text-white/60 hover:text-white"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-heading font-medium tracking-wide text-[10px]">
                {item.label}
              </span>
            </div>
            
            {isActive && (
              <motion.div
                layoutId="bottom-nav-indicator"
                className="absolute bottom-1 w-5 h-1 rounded-full bg-gradient-to-r from-primary to-accent"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
