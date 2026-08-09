import { Home, Dumbbell, UtensilsCrossed, BarChart3, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { hapticLight } from "@/lib/haptics";
import { useUnreadMessages } from "@/hooks/queries/useInbox";

/**
 * Five-tab primary navigation.
 * Each tab owns a group of routes so deep pages keep their tab highlighted —
 * every legacy route is still reachable, it just lives under a clearer home.
 */
const NAV_ITEMS = [
  { icon: Home, label: "Today", path: "/", match: ["/"] },
  {
    icon: Dumbbell,
    label: "Train",
    path: "/train",
    match: ["/train", "/sessions", "/builder", "/programme", "/exercises", "/hyrox", "/half-marathon", "/run", "/workout"],
  },
  { icon: UtensilsCrossed, label: "Fuel", path: "/nutrition", match: ["/nutrition", "/food", "/body"] },
  {
    icon: BarChart3,
    label: "Progress",
    path: "/progress",
    match: ["/progress", "/recovery", "/check-ins", "/history"],
  },
  {
    icon: User,
    label: "You",
    path: "/profile",
    match: ["/profile", "/inbox", "/leaderboard", "/quests", "/duels", "/shop", "/community", "/coach"],
  },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: unread } = useUnreadMessages();

  // Hide nav during active workout or on login
  if (location.pathname.startsWith("/workout/") || location.pathname === "/login") return null;

  const path = location.pathname;
  const activePath =
    NAV_ITEMS.find((item) =>
      item.match.some((m) => (m === "/" ? path === "/" : path === m || path.startsWith(`${m}/`))),
    )?.path ?? null;

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-50 hairline border-t bg-card/90 backdrop-blur-xl"
      style={{ boxShadow: "0 -8px 24px -12px hsl(0 0% 0% / 0.5)" }}
    >
      <div className="mx-auto flex max-w-lg md:max-w-2xl items-center justify-around pb-[env(safe-area-inset-bottom)] px-1 pt-1.5">
        {NAV_ITEMS.map(({ icon: Icon, label, path: itemPath }) => {
          const isActive = activePath === itemPath;
          return (
            <button
              key={itemPath}
              onClick={() => {
                if (location.pathname !== itemPath) hapticLight();
                navigate(itemPath);
              }}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              className="relative flex flex-col items-center justify-center gap-1 flex-1 min-h-[56px] py-1.5 focus-visible:outline-none rounded-xl transition-transform active:scale-95"
            >
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
                {itemPath === "/profile" && (unread ?? 0) > 0 && (
                  <span className="absolute -top-0.5 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    {unread}
                  </span>
                )}
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
