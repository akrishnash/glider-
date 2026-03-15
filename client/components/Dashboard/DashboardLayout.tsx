import { useState } from "react";
import { motion } from "framer-motion";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

type Tab = "profile" | "jobs" | "applications" | "analytics";

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  userEmail: string;
  onLogout: () => void;
  stats?: { total_runs: number; submitted: number; running: number } | null;
}

export default function DashboardLayout({
  children,
  activeTab,
  onTabChange,
  userEmail,
  onLogout,
  stats,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-32 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -right-32 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex h-screen">
        <Sidebar
          activeTab={activeTab}
          onTabChange={onTabChange}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onLogout={onLogout}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar
            userEmail={userEmail}
            onMenuClick={() => setSidebarOpen(!sidebarOpen)}
            stats={stats}
          />

          <motion.main
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 overflow-auto"
          >
            <div className="p-6 sm:p-8 max-w-7xl mx-auto">
              {children}
            </div>
          </motion.main>
        </div>
      </div>
    </div>
  );
}
