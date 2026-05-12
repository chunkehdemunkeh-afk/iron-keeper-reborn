import { Home, Heart, BarChart3, UtensilsCrossed, User, Trophy } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { hapticLight } from "@/lib/haptics";

const NAV_ITEMS = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Heart, label: "Recovery", path: "/recovery" },
  { icon: UtensilsCrossed, label: "Nutrition", path: "/nutrition" },
  { icon: BarChart3, label: "Progress", path: "/progress" },
  { icon: Trophy, label: "Ranks", path: "/leaderboard" },
  { icon: User, label: "Profile", path: "/profile" },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide nav during active workout or on login
  if (location.pathname.startsWith("/workout/") || location.pathname === "/login") return null;

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-50 hairline border-t bg-card/90 backdrop-blur-xl"
      style={{ boxShadow: "0 -8px 24px -12px hsl(0 0% 0% / 0.5)" }}
    >
      <div className="mx-auto flex max-w-lg md:max-w-2xl items-center justify-around pb-[env(safe-area-inset-bottom)] px-1 pt-1.5">
        {NAV_ITEMS.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              className="relative flex flex-col items-center justify-center gap-1 flex-1 min-h-[56px] py-1.5 focus-visible:outline-none rounded-xl transition-transform active:scale-95"
            >
              {/* Soft amber pill behind active icon (Whoop style) */}
              <div className="relative flex items-center justify-center h-9 w-12">
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full bg-primary/15"
                    style={{ boxShadow: "inset 0 0 0 1px hsl(36 95% 55% / 0.25)" }}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    aria-hidden
                  />
                )}
                <Icon
                  aria-hidden
                  strokeWidth={isActive ? 2.4 : 2}
                  className={`relative h-[22px] w-[22px] transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                />
              </div>
              <span
                className={`text-[10px] font-semibold tracking-wide transition-colors leading-none ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
