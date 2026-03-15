import { motion } from 'framer-motion';
import { Search, Bell, Menu } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

interface TopBarProps {
  user: User;
  onMenuClick: () => void;
}

export default function TopBar({ user, onMenuClick }: TopBarProps) {
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
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-slate-800 rounded-lg transition"
          >
            <Menu className="h-5 w-5 text-slate-400" />
          </button>

          <div className="hidden md:flex items-center space-x-2 flex-1 max-w-md bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2 hover:border-slate-600/50 transition">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search applications..."
              className="bg-transparent outline-none text-slate-300 placeholder-slate-500 w-full"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative p-2 text-slate-400 hover:text-slate-200 transition"
          >
            <Bell className="h-5 w-5" />
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-1 right-1 w-2 h-2 bg-violet-600 rounded-full"
            />
          </motion.button>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="w-10 h-10 bg-gradient-to-br from-violet-600 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold cursor-pointer hover:shadow-lg hover:shadow-violet-500/50 transition-all"
          >
            {user.email?.[0]?.toUpperCase() || 'U'}
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
}
