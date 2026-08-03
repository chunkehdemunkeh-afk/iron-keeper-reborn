import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useUserRole() {
  const { user } = useAuth();
  const [isCoach, setIsCoach] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);
  const [tick, setTick] = useState(0);

  // Fired after a pending coach signup choice is applied post sign-in.
  useEffect(() => {
    const onChanged = () => setTick((t) => t + 1);
    window.addEventListener("ik-role-changed", onChanged);
    return () => window.removeEventListener("ik-role-changed", onChanged);
  }, []);

  useEffect(() => {
    if (!user) {
      setIsCoach(false);
      setRoleLoading(false);
      return;
    }

    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(
        ({ data }) => {
          setIsCoach(data?.some((r) => r.role === "coach") ?? false);
          setRoleLoading(false);
        },
        () => {
          setRoleLoading(false);
        },
      );
  }, [user, tick]);

  return { isCoach, roleLoading };
}
