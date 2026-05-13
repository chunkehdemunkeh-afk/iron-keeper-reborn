import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { isDemoMode, exitDemo, DEMO_USER_ID, DEMO_USER_EMAIL, DEMO_DISPLAY_NAME } from "@/lib/demo-mode";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: { display_name: string | null; avatar_url: string | null } | null;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<{ error: string | null }>;
  updateAvatar: (file: File) => Promise<{ error: string | null }>;
  removeAvatar: () => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  profile: null,
  signOut: async () => {},
  updateDisplayName: async () => ({ error: null }),
  updateAvatar: async () => ({ error: null }),
  removeAvatar: async () => ({ error: null }),
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);

  useEffect(() => {
    // ── Demo Mode short-circuit ──
    if (isDemoMode()) {
      const demoUser = {
        id: DEMO_USER_ID,
        email: DEMO_USER_EMAIL,
        aud: "authenticated",
        app_metadata: {},
        user_metadata: { display_name: DEMO_DISPLAY_NAME },
        created_at: new Date().toISOString(),
      } as unknown as User;
      setUser(demoUser);
      setSession({ user: demoUser } as unknown as Session);
      setProfile({ display_name: DEMO_DISPLAY_NAME, avatar_url: null });
      setLoading(false);
      return;
    }

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch profile and update last_seen_at with setTimeout to avoid deadlock
          setTimeout(async () => {
            const [{ data }] = await Promise.all([
              supabase
                .from("profiles")
                .select("display_name, avatar_url")
                .eq("user_id", session.user.id)
                .single(),
              supabase
                .from("profiles")
                .update({ last_seen_at: new Date().toISOString() } as any)
                .eq("user_id", session.user.id),
            ]);
            setProfile(data);
            // Daily login XP — awardXp dedupes via oncePerDay
            try {
              const { awardXpAndNotify } = await import("@/lib/gamification/notify");
              void awardXpAndNotify({ source: "daily_open" });
            } catch {}
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (isDemoMode()) {
      exitDemo();
      setUser(null);
      setSession(null);
      setProfile(null);
      window.location.href = "/login";
      return;
    }
    await supabase.auth.signOut();
  };

  const updateDisplayName = async (name: string) => {
    if (!user) return { error: "Not signed in" };
    const trimmed = name.trim();
    if (trimmed.length < 2) return { error: "Name must be at least 2 characters" };
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("user_id", user.id);
    if (error) return { error: error.message };
    setProfile((p) => ({ display_name: trimmed, avatar_url: p?.avatar_url ?? null }));
    return { error: null };
  };

  const updateAvatar = async (file: File) => {
    if (!user) return { error: "Not signed in" };
    if (!file.type.startsWith("image/")) return { error: "File must be an image" };
    if (file.size > 5 * 1024 * 1024) return { error: "Image must be smaller than 5MB" };

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) return { error: uploadError.message };

    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = pub.publicUrl;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("user_id", user.id);
    if (updateError) return { error: updateError.message };

    setProfile((p) => ({ display_name: p?.display_name ?? null, avatar_url: publicUrl }));
    return { error: null };
  };

  const removeAvatar = async () => {
    if (!user) return { error: "Not signed in" };

    // Best-effort cleanup of any existing files in the user's folder
    const { data: list } = await supabase.storage.from("avatars").list(user.id);
    if (list && list.length > 0) {
      await supabase.storage
        .from("avatars")
        .remove(list.map((f) => `${user.id}/${f.name}`));
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("user_id", user.id);
    if (updateError) return { error: updateError.message };

    setProfile((p) => ({ display_name: p?.display_name ?? null, avatar_url: null }));
    return { error: null };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, signOut, updateDisplayName, updateAvatar, removeAvatar }}>
      {children}
    </AuthContext.Provider>
  );
}
