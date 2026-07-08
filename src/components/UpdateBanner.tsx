import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  visible: boolean;
}

export default function UpdateBanner({ visible }: Props) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 px-4 text-sm font-medium shadow-lg"
          style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))" }}
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          Updating Iron Warrior…
        </motion.div>
      )}
    </AnimatePresence>
  );
}
