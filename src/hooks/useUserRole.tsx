import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useUserRole() {
  const { user } = useAuth();
  const [isCoach, setIsCoach] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);

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
      .then(({ data }) => {
        setIsCoach(data?.some((r) => r.role === "coach") ?? false);
        setRoleLoading(false);
      })
      .catch(() => {
        // A rejected promise here would otherwise leave roleLoading stuck
        // true forever, since nothing else would clear it.
        setRoleLoading(false);
      });
  }, [user]);

  return { isCoach, roleLoading };
}
