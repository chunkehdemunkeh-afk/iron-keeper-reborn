import { motion, animate, Reorder, useDragControls, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { GripVertical, ChevronUp, ChevronDown, Play, Shuffle, Check, Trash2 } from "lucide-react";

interface ExerciseDragItemProps {
  exId: string;
  isExpanded: boolean;
  allDone: boolean;
  index: number;
  name: string;
  sets: number;
  reps: string;
  onToggleExpand: () => void;
  onPlayVideo: () => void;
  onSwap: () => void;
  hasSubs: boolean;
  lastSub?: { subName: string; subId: string };
  onDelete?: () => void;
  children: React.ReactNode;
}

export default function ExerciseDragItem({
  exId, isExpanded, allDone, index, name, sets, reps, onToggleExpand, onPlayVideo, onSwap, hasSubs,
  lastSub, onDelete, children,
}: ExerciseDragItemProps) {
  const dragControls = useDragControls();
  const swipeX = useMotionValue(0);
  const deleteBgOpacity = useTransform(swipeX, [-100, -30], [1, 0]);

  function handleSwipeDragEnd(_: unknown, info: PanInfo) {
    if (onDelete && info.offset.x < -80) {
      onDelete();
    } else {
      animate(swipeX, 0, { type: "spring", stiffness: 400, damping: 30 });
    }
  }

  return (
    <Reorder.Item
      value={exId}
      dragListener={false}
      dragControls={dragControls}
      className={`glass-card rounded-xl overflow-hidden transition-all ${allDone ? "ring-1 ring-success/40 opacity-70" : ""}`}
      style={{ position: "relative" }}
    >
      {/* Swipe-to-delete: header row only */}
      <div className="relative overflow-hidden">
        {onDelete && (
          <motion.div
            style={{ opacity: deleteBgOpacity }}
            className="absolute inset-0 flex items-center justify-end pr-4 bg-destructive"
          >
            <Trash2 className="h-4 w-4 text-white" />
          </motion.div>
        )}
        <motion.div
          style={{ x: swipeX, touchAction: "pan-y" }}
          drag={onDelete ? "x" : false}
          dragConstraints={{ left: -100, right: 0 }}
          dragElastic={{ left: 0.1, right: 0 }}
          onDragEnd={handleSwipeDragEnd}
          className="relative w-full flex items-center gap-2 p-3"
        >
          <div
            onPointerDown={(e) => dragControls.start(e)}
            className="flex h-8 w-6 items-center justify-center cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground transition-colors"
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <button
            onClick={onToggleExpand}
            className="flex-1 flex items-center gap-3 text-left"
          >
            <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${allDone ? "bg-success/20 text-success" : "bg-primary/10 text-primary"}`}>
              {allDone ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{name}</p>
              <p className="text-xs text-muted-foreground">{sets} × {reps}</p>
              {lastSub && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Shuffle className="h-2.5 w-2.5 text-amber-400" />
                  <span className="text-[10px] text-amber-400 font-medium">
                    Last session: {lastSub.subName}
                  </span>
                </div>
              )}
            </div>
          </button>
          <button
            onClick={onPlayVideo}
            className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary mr-1"
          >
            <Play className="h-3 w-3" />
          </button>
          {hasSubs && (
            <button
              onClick={onSwap}
              className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/50 text-accent-foreground mr-1 hover:bg-accent transition-colors"
            >
              <Shuffle className="h-3 w-3" />
            </button>
          )}
          <button onClick={onToggleExpand}>
            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
        </motion.div>
      </div>
      {children}
    </Reorder.Item>
  );
}
