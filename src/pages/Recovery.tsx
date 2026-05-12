import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import RecoveryPanel from "@/components/recovery/RecoveryPanel";
import RecoveryTips from "@/components/RecoveryTips";
import { useAuth } from "@/hooks/useAuth";
import { getUserPreferences } from "@/lib/user-preferences";
import HelpButton from "@/components/demo/HelpButton";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";

export default function Recovery() {
  const { user } = useAuth();
  const prefs = user ? getUserPreferences(user.id) : null;
  const queryClient = useQueryClient();
  const ptr = usePullToRefresh({ onRefresh: () => queryClient.invalidateQueries() });

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <div className="mx-auto max-w-lg md:max-w-2xl px-4 pt-6 pb-24 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-2xl font-bold"
            >
              Recovery
            </motion.h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Train hard, recover smart — your readiness in one place.
            </p>
          </div>
          <HelpButton />
        </div>

        <RecoveryPanel />

        {prefs?.splitId !== "none" && <RecoveryTips splitId={prefs?.splitId} />}
      </div>
    </div>
  );
}
