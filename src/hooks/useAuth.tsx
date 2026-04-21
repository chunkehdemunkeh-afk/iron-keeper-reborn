import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: { display_name: string | null; avatar_url: string | null } | null;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<{ error: string | null }>;
  updateAvatar: (file: File) => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  profile: null,
  signOut: async () => {},
  updateDisplayName: async () => ({ error: null }),
  updateAvatar: async () => ({ error: null }),
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);

  useEffect(() => {
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

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, signOut, updateDisplayName, updateAvatar }}>
      {children}
    </AuthContext.Provider>
  );
}
