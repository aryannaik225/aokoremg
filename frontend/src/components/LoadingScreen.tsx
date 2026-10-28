import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

const SLOW_THRESHOLD_MS = 4000;

/**
 * Full-screen loading gate shown while the initial /api/days + /api/metrics
 * fetch is in flight. Render's free tier spins the backend down after
 * inactivity, so a cold start can take up to ~50s — long enough that a bare
 * spinner reads as a broken app. After SLOW_THRESHOLD_MS this swaps its
 * copy to set that expectation explicitly instead of leaving the user
 * guessing.
 */
export function LoadingScreen() {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsSlow(true), SLOW_THRESHOLD_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 transition-colors duration-300"
      style={{ backgroundColor: "var(--color-bg)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-3xl border border-black/10 bg-white/50 px-8 py-10 text-center shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-[#141415]/50">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <span
            className="absolute inset-0 rounded-full blur-xl"
            style={{ backgroundColor: "var(--color-forecast)", opacity: 0.4 }}
          />
          <motion.span
            className="relative h-12 w-12 rounded-full border-[3px]"
            style={{ borderColor: "var(--color-forecast)", borderTopColor: "transparent", borderRightColor: "transparent" }}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={isSlow ? "slow" : "fast"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="text-sm font-medium leading-relaxed"
            style={{ color: "var(--color-text-primary)" }}
          >
            {isSlow
              ? "Waking up the cloud server. Please allow up to 50 seconds for the free instance to start..."
              : "Connecting to Wind Forecast API..."}
          </motion.p>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
