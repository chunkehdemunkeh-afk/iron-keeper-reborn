import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { hapticMedium, hapticSuccess } from "@/lib/haptics";

type Mode = "idle" | "signin" | "signup" | "forgot" | "email_sent";

export default function EmailAuthForm() {
  const [mode, setMode] = useState<Mode>("idle");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const clearErrors = () => { setEmailError(""); setPasswordError(""); };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (mode === "idle" && val.includes("@")) setMode("signin");
    else if (mode !== "idle" && val === "") setMode("idle");
  };

  const handleSubmit = async () => {
    clearErrors();
    hapticMedium();

    if (!email.includes("@")) { setEmailError("Enter a valid email address"); return; }
    if (mode === "forgot") {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setLoading(false);
      if (error) { toast.error("Couldn't send reset email. Try again."); return; }
      hapticSuccess();
      setMode("email_sent");
      return;
    }

    if (password.length < 6) { setPasswordError("Password must be at least 6 characters"); return; }
    if (mode === "signup" && password !== confirmPassword) {
      setPasswordError("Passwords don't match");
      return;
    }

    setLoading(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        if (error.message.includes("Invalid login")) {
          setPasswordError("Incorrect email or password");
        } else {
          toast.error("Sign in failed. Please try again.");
        }
        return;
      }
      hapticSuccess();
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
      setLoading(false);
      if (error) {
        if (error.message.includes("already registered")) {
          setEmailError("An account with this email already exists");
        } else {
          toast.error("Sign up failed. Please try again.");
        }
        return;
      }
      hapticSuccess();
      setMode("email_sent");
    }
  };

  if (mode === "email_sent") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full rounded-2xl bg-card/60 border border-border/30 p-5 text-center space-y-2"
      >
        <div className="flex justify-center">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Mail className="h-5 w-5 text-primary" />
          </div>
        </div>
        <p className="text-sm font-semibold text-foreground">Check your email</p>
        <p className="text-xs text-muted-foreground">We sent a link to <span className="text-foreground">{email}</span></p>
        <button
          onClick={() => { setMode("signin"); setPassword(""); }}
          className="text-xs text-primary underline underline-offset-2 pt-1"
        >
          Back to sign in
        </button>
      </motion.div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {/* Email input */}
      <div className="relative">
        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={e => handleEmailChange(e.target.value)}
          className="w-full bg-card/60 border border-border/30 rounded-2xl pl-11 pr-4 py-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
        />
        {emailError && <p className="text-[11px] text-destructive mt-1 ml-1">{emailError}</p>}
      </div>

      <AnimatePresence>
        {(mode === "signin" || mode === "signup") && (
          <motion.div
            key="password-fields"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="space-y-3 overflow-hidden"
          >
            {/* Password input */}
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={e => { setPassword(e.target.value); clearErrors(); }}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
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

            {/* Confirm password (signup only) */}
            <AnimatePresence>
              {mode === "signup" && (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); clearErrors(); }}
                      onKeyDown={e => e.key === "Enter" && handleSubmit()}
                      className="w-full bg-card/60 border border-border/30 rounded-2xl pl-11 pr-4 py-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {passwordError && <p className="text-[11px] text-destructive ml-1">{passwordError}</p>}

            {/* Submit button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSubmit}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl gradient-primary text-primary-foreground py-4 text-sm font-bold tracking-wide shadow-lg disabled:opacity-60"
              style={{ boxShadow: "0 8px 30px -6px hsl(36 95% 55% / 0.4)" }}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {mode === "signin" ? "Sign In" : "Create Account"}
                  <ArrowRight className="h-4 w-4 opacity-70" />
                </>
              )}
            </motion.button>

            {/* Toggle sign in / sign up + forgot */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <button
                onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); clearErrors(); setPassword(""); setConfirmPassword(""); }}
                className="text-primary underline underline-offset-2"
              >
                {mode === "signin" ? "Create an account" : "Sign in instead"}
              </button>
              {mode === "signin" && (
                <button
                  onClick={() => { setMode("forgot"); clearErrors(); }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Forgot password?
                </button>
              )}
            </div>
          </motion.div>
        )}

        {mode === "forgot" && (
          <motion.div
            key="forgot"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="space-y-3 overflow-hidden"
          >
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSubmit}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl gradient-primary text-primary-foreground py-4 text-sm font-bold tracking-wide shadow-lg disabled:opacity-60"
              style={{ boxShadow: "0 8px 30px -6px hsl(36 95% 55% / 0.4)" }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Reset Link"}
            </motion.button>
            <button
              onClick={() => { setMode("signin"); clearErrors(); }}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to sign in
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
