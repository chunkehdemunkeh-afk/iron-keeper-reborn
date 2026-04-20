import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Zap, BarChart3, Shield, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import EmailAuthForm from "@/components/auth/EmailAuthForm";

export default function Login() {
  const handleOAuthSignIn = async (provider: "google" | "apple") => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) toast.error("Sign in failed. Please try again.");
  };

  const features = [
    { icon: Zap, title: "Explosive Training", desc: "Track power & agility sessions" },
    { icon: BarChart3, title: "Visual Progress", desc: "Charts that show your growth" },
    { icon: Shield, title: "Keeper-Focused", desc: "Exercises built for goalkeepers" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-end px-6 pb-12 pt-20 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-[-120px] left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full opacity-15 blur-[100px] pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(36 95% 55%), transparent 70%)" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-sm space-y-10 text-center flex flex-col items-center"
      >
        {/* Logo & Branding */}
        <div className="space-y-4">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.15 }}
            className="inline-flex h-20 w-20 rounded-3xl gradient-primary items-center justify-center glow-primary"
          >
            <Shield className="h-10 w-10 text-primary-foreground" />
          </motion.div>
          <div>
            <h1 className="font-display text-4xl font-bold text-foreground tracking-tight">
              Iron Keeper
            </h1>
            <p className="text-muted-foreground text-sm mt-1.5 tracking-wide uppercase">
              Goalkeeper Training Tracker
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="w-full space-y-2.5">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.1, duration: 0.4 }}
              className="flex items-center gap-4 rounded-2xl bg-card/60 border border-border/30 p-4 text-left"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <div className="w-full space-y-4 pt-2">
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.4 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleOAuthSignIn("google")}
            className="w-full flex items-center justify-center gap-3 rounded-2xl gradient-primary text-primary-foreground py-4 text-sm font-bold tracking-wide shadow-lg transition-transform"
            style={{ boxShadow: "0 8px 30px -6px hsl(36 95% 55% / 0.4)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="hsl(220 20% 7%)"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="hsl(220 20% 7%)"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="hsl(220 20% 7%)"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="hsl(220 20% 7%)"/>
            </svg>
            Continue with Google
            <ChevronRight className="h-4 w-4 opacity-60" />
          </motion.button>

          {/* Divider */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.4 }}
            className="flex items-center gap-3"
          >
            <div className="flex-1 h-px bg-border/40" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border/40" />
          </motion.div>

          {/* Email auth */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.4 }}
            className="w-full"
          >
            <EmailAuthForm />
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.95 }}
            className="text-[11px] text-muted-foreground"
          >
            Your data syncs securely across all devices
          </motion.p>

        </div>
      </motion.div>
    </div>
  );
}
