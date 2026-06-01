"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { User, ArrowRight, Heart } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-dark">
        <Heart className="w-12 h-12 text-primary fill-primary animate-pulse" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = createClient();
  const redirectTo = searchParams.get("redirectTo") || "/pairing";

  // Check if user is already logged in
  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check if they already have a profile + couple session
        const { data: profile } = await (supabase.from("users") as any)
          .select("couple_session_id, display_name")
          .eq("id", session.user.id)
          .single();

        if (profile?.couple_session_id) {
          router.push("/dashboard");
        } else if (profile?.display_name) {
          router.push("/pairing");
        }
      }
    }
    checkSession();
  }, [router, supabase, redirectTo]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) {
      toast.error("Please enter a username");
      return;
    }
    if (trimmed.length < 2) {
      toast.error("Username must be at least 2 characters");
      return;
    }

    setLoading(true);
    try {
      // Always sign out first to clear any stale session
      await supabase.auth.signOut();

      // We use a dummy email and a derived password to allow multi-device username login
      const cleanUsername = trimmed.toLowerCase();
      const email = `${cleanUsername}@bondxp.local`;
      const password = `${cleanUsername}_bondxp_secure_pass`;

      // 1. Try signing in
      let { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // 2. If user doesn't exist, sign up
      if (error && (error.message.includes("Invalid login credentials") || error.status === 400)) {
        const signUpResult = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpResult.error) {
          toast.error(signUpResult.error.message);
          setLoading(false);
          return;
        }

        data = signUpResult.data as any;
      } else if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      const userId = data.user?.id;
      if (!userId) throw new Error("No user ID returned");

      // Check if user already has a profile row in the users table
      const { data: existing } = await (supabase.from("users") as any)
        .select("id, couple_session_id")
        .eq("id", userId)
        .maybeSingle();

      if (!existing) {
        // Pre-create the user row with the display_name (original casing)
        await (supabase.from("users") as any).insert({
          id: userId,
          display_name: trimmed, // keep original casing
          role: "task_user", // default
        });
      }

      toast.success(`Welcome, ${trimmed}! 💕`);

      if (existing?.couple_session_id) {
        router.push("/dashboard");
      } else {
        router.push(redirectTo);
      }
    } catch (err: any) {
      toast.error("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-screen bg-dark flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-gradient-glow pointer-events-none opacity-40" />
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary/10 blur-[128px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-accent/10 blur-[128px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md card-glass border border-white/[0.08] shadow-2xl relative z-10 p-8 flex flex-col items-center"
      >
        {/* App Logo */}
        <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-primary/20 mb-6 bg-black/20 flex items-center justify-center shadow-inner">
          <Image
            src="/logo.png"
            alt="BondXP Logo"
            fill
            className="object-cover animate-pulse"
          />
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-heading font-black text-white text-center leading-none">
          Bond<span className="text-gradient-primary">XP</span>
        </h1>
        <p className="text-xs font-body text-white/50 text-center mt-2 max-w-[280px]">
          A cozy, relationship-powered productivity reward system for couples.
        </p>

        {/* Auth Form */}
        <div className="w-full mt-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-heading font-semibold uppercase tracking-wider text-white/60">
                Your Username
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-4 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter a nickname or first name..."
                  disabled={loading}
                  maxLength={32}
                  className="input pl-11 text-white bg-white/[0.03] border-white/[0.08] focus:border-primary"
                  required
                  autoComplete="off"
                />
              </div>
              <p className="text-[10px] text-white/30 font-body pl-1">
                No email or password needed — just pick a name 💕
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 cursor-pointer font-bold text-sm tracking-wide"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Heart className="w-4 h-4 animate-ping text-white" />
                  Entering...
                </span>
              ) : (
                <>
                  Enter BondXP
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </main>
  );
}
