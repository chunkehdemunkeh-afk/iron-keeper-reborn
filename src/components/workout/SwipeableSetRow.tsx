import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { Trash2 } from "lucide-react";

export default function SwipeableSetRow({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-100, -60], [1, 0]);
  const deleteBgOpacity = useTransform(x, [-100, -30], [1, 0]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x < -80) onDelete();
  }

  return (
    <div className="relative overflow-hidden rounded-lg">
      <motion.div
        style={{ opacity: deleteBgOpacity }}
        className="absolute inset-0 flex items-center justify-end pr-3 bg-destructive/20 rounded-lg"
      >
        <motion.div style={{ opacity: deleteOpacity }}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </motion.div>
      </motion.div>
      <motion.div
        drag="x"
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.1}
        style={{ x }}
        onDragEnd={handleDragEnd}
        className="relative z-10"
      >
        {children}
      </motion.div>
    </div>
  );
}
