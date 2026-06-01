"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Gift, BarChart2, Settings, LogOut, Heart } from "lucide-react";
import BottomNav from "./BottomNav";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const supabase = createClient();

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);

      // Get profile
      const { data: p } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (!p) {
        // Redirect to pairing if profile doesn't exist
        router.push("/pairing");
        return;
      }

      setProfile(p);
      setLoading(false);
    }
    checkUser();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const menuItems = [
    { label: "Home", href: "/dashboard", icon: Home },
    { label: "Rewards", href: "/rewards", icon: Gift },
    { label: "Cute Corner", href: "/notes", icon: Heart },
    { label: "Analytics", href: "/analytics", icon: BarChart2 },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-dark">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="relative flex items-center justify-center"
        >
          <Heart className="w-12 h-12 text-primary fill-primary" />
        </motion.div>
        <p className="mt-4 text-xs font-heading font-semibold text-white/50 uppercase tracking-widest">
          Loading BondXP...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark text-white flex flex-col md:flex-row pb-16 md:pb-0">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-white/[0.06] bg-black/40 backdrop-blur-md p-6 h-screen sticky top-0">
        <div className="flex items-center gap-3 mb-8">
          <div className="relative w-8 h-8 rounded-full overflow-hidden border border-primary/30">
            <Image
              src="/logo.png"
              alt="BondXP Logo"
              fill
              className="object-cover"
            />
          </div>
          <span className="font-heading font-bold text-lg tracking-wider bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            BondXP
          </span>
        </div>

        <nav className="flex-1 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-heading font-medium transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-primary/10 to-accent/5 text-primary border border-primary/20 shadow-glow-primary-sm"
                    : "text-white/60 hover:text-white hover:bg-white/[0.03] border border-transparent"
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-heading font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-200 cursor-pointer mt-auto"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen relative overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-1"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
