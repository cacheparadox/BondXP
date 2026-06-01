"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { Mail, ArrowRight, Heart } from "lucide-react";
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
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const supabase = createClient();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  // Check if user is already logged in
  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push(redirectTo);
      }
    }
    checkSession();
  }, [router, supabase, redirectTo]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
        },
      });

      if (error) {
        toast.error(error.message);
      } else {
        setSent(true);
        toast.success("Magic link sent! Check your email inbox.");
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

        {/* Auth Forms */}
        <div className="w-full mt-8">
          {!sent ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-heading font-semibold uppercase tracking-wider text-white/60">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-4 w-4 h-4 text-white/40" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address..."
                    disabled={loading}
                    className="input pl-11 text-white bg-white/[0.03] border-white/[0.08] focus:border-primary"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 cursor-pointer font-bold text-sm tracking-wide"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Heart className="w-4 h-4 animate-ping text-white" />
                    Sending link...
                  </span>
                ) : (
                  <>
                    Send Magic Link
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4 flex flex-col items-center gap-3"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
                <Heart className="w-6 h-6 fill-primary/10 animate-bounce" />
              </div>
              <h2 className="text-lg font-heading font-bold text-white">Check your email!</h2>
              <p className="text-xs font-body text-white/60 max-w-[260px] leading-relaxed">
                We sent a secure magic sign-in link to <strong className="text-white">{email}</strong>. Click it to log in.
              </p>
              <button
                onClick={() => setSent(false)}
                className="text-xs text-primary font-heading font-medium hover:underline mt-4 cursor-pointer"
              >
                ← Try a different email
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </main>
  );
}
