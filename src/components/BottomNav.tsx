import { Home, Heart, BarChart3, UtensilsCrossed, User, Trophy } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

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
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-card/95 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-lg md:max-w-2xl items-center justify-around pb-[env(safe-area-inset-bottom)] px-2 pt-1">
        {NAV_ITEMS.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              className="relative flex flex-col items-center gap-0.5 px-3 py-2 min-h-[44px] min-w-[44px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-1 h-0.5 w-6 rounded-full gradient-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  aria-hidden
                />
              )}
              <Icon
                aria-hidden
                className={`h-5 w-5 transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}
              />
              <span
                className={`text-[9px] font-medium transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}
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
