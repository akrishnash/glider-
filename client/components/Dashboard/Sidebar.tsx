import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, FileCheck, User, BarChart2, X } from "lucide-react";

const navItems = [
  { id: "jobs" as const, label: "Jobs", icon: Briefcase },
  { id: "applications" as const, label: "Applications", icon: FileCheck },
  { id: "analytics" as const, label: "Analytics", icon: BarChart2 },
  { id: "profile" as const, label: "Profile", icon: User },
];

type Tab = "profile" | "jobs" | "applications" | "analytics";

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export default function Sidebar({ activeTab, onTabChange, isOpen, onClose, onLogout }: SidebarProps) {
  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : "-100%" }}
        transition={{ duration: 0.3 }}
        className="fixed lg:relative z-40 w-64 h-screen bg-slate-900/80 backdrop-blur-xl border-r border-slate-700/50 flex flex-col"
      >
        <div className="p-6 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center space-x-3"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-cyan-600 rounded-lg flex items-center justify-center text-white font-bold">
              G
            </div>
            <h1 className="text-xl font-bold text-white">Glider</h1>
          </motion.div>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-slate-800 rounded-lg transition"
            aria-label="Close menu"
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <motion.button
                key={item.id}
                type="button"
                onClick={() => {
                  onTabChange(item.id);
                  onClose();
                }}
                className="w-full relative group"
                whileHover={{ x: 4 }}
              >
                <div
                  className={`px-4 py-3 rounded-lg flex items-center space-x-3 transition-all duration-300 ${
                    isActive
                      ? "bg-gradient-to-r from-violet-600/30 to-cyan-600/30 text-white"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="font-medium">{item.label}</span>
                </div>
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-cyan-600/20 rounded-lg -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </motion.button>
            );
          })}
        </nav>

        <div className="p-6 border-t border-slate-700/50 space-y-3">
          <button
            type="button"
            onClick={onLogout}
            className="w-full px-4 py-2 bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition duration-300 font-medium"
          >
            Sign out
          </button>
        </div>
      </motion.aside>
    </>
  );
}
