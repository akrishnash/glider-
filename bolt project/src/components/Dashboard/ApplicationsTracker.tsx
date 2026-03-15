import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Eye, RotateCcw, Trash2, Plus, Loader as Loader2 } from 'lucide-react';
import { Database } from '../../lib/supabase';

type Application = Database['public']['Tables']['applications']['Row'];

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  'Applied': { bg: 'bg-violet-500/20', text: 'text-violet-400', dot: 'bg-violet-500' },
  'Pending Review': { bg: 'bg-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-500' },
  'Submitted': { bg: 'bg-green-500/20', text: 'text-green-400', dot: 'bg-green-500' },
  'Interview': { bg: 'bg-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-500' },
};

export default function ApplicationsTracker() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, interviews: 0, submitted: 0 });

  useEffect(() => {
    loadApplications();
  }, [user]);

  const loadApplications = async () => {
    if (!user) return;

    setLoading(true);
    const { data } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', user.id)
      .order('applied_date', { ascending: false });

    if (data) {
      setApplications(data);
      setStats({
        total: data.length,
        interviews: data.filter((a) => a.status === 'Interview').length,
        submitted: data.filter((a) => a.status === 'Submitted').length,
      });
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('applications').delete().eq('id', id);
    loadApplications();
  };

  const handleAddApplication = async () => {
    if (!user) return;
    await supabase.from('applications').insert({
      user_id: user.id,
      company: 'New Company',
      position: 'New Position',
      status: 'Applied',
    });
    loadApplications();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Applications Tracker</h1>
          <p className="text-slate-400 mt-1">Monitor and manage your job applications</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleAddApplication}
          className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-lg hover:shadow-lg hover:shadow-violet-500/50 transition-all font-semibold"
        >
          <Plus className="h-5 w-5" />
          <span>New Application</span>
        </motion.button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Applied', value: stats.total, color: 'from-violet-600 to-violet-500' },
          { label: 'Interviews', value: stats.interviews, color: 'from-blue-600 to-blue-500' },
          { label: 'Submitted', value: stats.submitted, color: 'from-green-600 to-green-500' },
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6 hover:border-slate-600/50 transition overflow-hidden group relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-cyan-600/5" />
            <div className="relative z-10">
              <p className="text-slate-400 text-sm font-medium">{stat.label}</p>
              <p className={`text-4xl font-bold mt-2 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                {stat.value}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Company</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Position</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Date Applied</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app, idx) => {
                const colors = statusColors[app.status] || statusColors['Applied'];

                return (
                  <motion.tr
                    key={app.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="border-b border-slate-700/30 hover:bg-slate-700/20 transition group"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{app.company}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{app.position}</td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full ${colors.bg}`}>
                        <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                        <span className={`text-sm font-medium ${colors.text}`}>{app.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {new Date(app.applied_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2 text-cyan-400 hover:bg-cyan-500/20 rounded-lg transition"
                        >
                          <Eye className="h-4 w-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2 text-violet-400 hover:bg-violet-500/20 rounded-lg transition"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDelete(app.id)}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {applications.length === 0 && (
          <div className="px-6 py-12 text-center">
            <p className="text-slate-400">No applications yet. Start tracking your job applications!</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
