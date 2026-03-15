import { motion } from "framer-motion";
import { Menu } from "lucide-react";

interface TopBarProps {
  userEmail: string;
  onMenuClick: () => void;
  stats?: { total_runs: number; submitted: number; running: number } | null;
}

export default function TopBar({ userEmail, onMenuClick, stats }: TopBarProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="border-b border-slate-700/50 bg-slate-900/40 backdrop-blur-xl"
    >
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          <button
            type="button"
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-slate-800 rounded-lg transition"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5 text-slate-400" />
          </button>

          {stats != null && (
            <div className="hidden md:flex items-center gap-3 text-sm text-slate-400">
              <span>{stats.total_runs} run{stats.total_runs !== 1 ? "s" : ""}</span>
              {stats.submitted > 0 && (
                <span className="text-green-400">✓ {stats.submitted}</span>
              )}
              {stats.running > 0 && (
                <span className="text-amber-400">⋯ {stats.running}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="w-10 h-10 bg-gradient-to-br from-violet-600 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold cursor-default"
          >
            {userEmail?.[0]?.toUpperCase() ?? "U"}
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
}
