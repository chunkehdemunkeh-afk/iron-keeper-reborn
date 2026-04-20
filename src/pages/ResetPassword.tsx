import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, Loader2, Shield, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { hapticSuccess } from "@/lib/haptics";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Supabase sends the session via URL fragment on redirect
  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        // Session is now active — user can set new password
      }
    });
  }, []);

  const handleSubmit = async () => {
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords don't match"); return; }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error("Couldn't update password. The link may have expired.");
      return;
    }

    hapticSuccess();
    setDone(true);
    setTimeout(() => navigate("/"), 2000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-end px-6 pb-12 pt-20 relative overflow-hidden">
      <div
        className="absolute top-[-120px] left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full opacity-15 blur-[100px] pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(36 95% 55%), transparent 70%)" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-sm space-y-8 text-center flex flex-col items-center"
      >
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
            <h1 className="font-display text-3xl font-bold text-foreground tracking-tight">
              New Password
            </h1>
            <p className="text-muted-foreground text-sm mt-1.5">
              Choose a new password for your account
            </p>
          </div>
        </div>

        {done ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full rounded-2xl bg-card/60 border border-border/30 p-6 text-center space-y-3"
          >
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
            </div>
            <p className="text-sm font-semibold text-foreground">Password updated</p>
            <p className="text-xs text-muted-foreground">Redirecting you now…</p>
          </motion.div>
        ) : (
          <div className="w-full space-y-3">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="New password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                className="w-full bg-card/60 border border-border/30 rounded-2xl pl-11 pr-12 py-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                className="w-full bg-card/60 border border-border/30 rounded-2xl pl-11 pr-4 py-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            {error && <p className="text-[11px] text-destructive ml-1">{error}</p>}

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSubmit}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl gradient-primary text-primary-foreground py-4 text-sm font-bold tracking-wide shadow-lg disabled:opacity-60"
              style={{ boxShadow: "0 8px 30px -6px hsl(36 95% 55% / 0.4)" }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set New Password"}
            </motion.button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
