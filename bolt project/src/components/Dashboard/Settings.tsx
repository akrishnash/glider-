import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, Shield, LogOut } from 'lucide-react';

export default function Settings() {
  const { signOut } = useAuth();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">Manage your account preferences</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Bell className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Notifications</h3>
              <p className="text-slate-400 text-sm mt-1">Get updates on your applications</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-slate-300 transition font-medium">
            Enable
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <Shield className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Privacy & Security</h3>
              <p className="text-slate-400 text-sm mt-1">Control your data and security settings</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-slate-300 transition font-medium">
            Manage
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-red-500/20 rounded-lg">
              <LogOut className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Sign Out</h3>
              <p className="text-slate-400 text-sm mt-1">End your current session</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => signOut()}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400 transition font-medium"
          >
            Sign Out
          </motion.button>
        </div>
      </motion.div>

      <div className="pt-4 text-center text-slate-500 text-sm">
        <p>ApplyAI v1.0 • Built for productivity</p>
      </div>
    </div>
  );
}
