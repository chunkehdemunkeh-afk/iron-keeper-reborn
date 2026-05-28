import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { HOME_WORKOUTS } from "@/lib/home-workouts";

const HomeSessionCard = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        Home Session
      </p>
      <div className="grid grid-cols-3 gap-2">
        {HOME_WORKOUTS.map((workout) => (
          <button
            key={workout.id}
            onClick={() => navigate(`/session/${workout.id}`)}
            className="flex flex-col items-start gap-1 rounded-xl bg-card hairline border p-3 active:scale-95 transition-transform text-left"
          >
            <span
              className="h-1.5 w-6 rounded-full mb-0.5"
              style={{ background: workout.color }}
            />
            <span className="text-xs font-semibold text-foreground leading-tight font-display">
              {workout.name}
            </span>
            <span className="text-[10px] text-muted-foreground">{workout.focus}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
};

export default HomeSessionCard;
