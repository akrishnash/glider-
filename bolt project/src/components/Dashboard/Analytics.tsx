import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Clock, TrendingUp, Zap } from 'lucide-react';

export default function Analytics() {
  const { user } = useAuth();
  const [data, setData] = useState({
    timeline: [],
    statusDistribution: [],
    topCompanies: [],
    stats: { timeSaved: 0, avgTime: 0, applicationRate: 0 },
  });

  useEffect(() => {
    loadAnalytics();
  }, [user]);

  const loadAnalytics = async () => {
    if (!user) return;

    const { data: apps } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', user.id);

    if (!apps) return;

    const last30Days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      last30Days.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        applications: 0,
      });
    }

    apps.forEach((app) => {
      const appDate = new Date(app.applied_date);
      const daysDiff = Math.floor((Date.now() - appDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff < 30) {
        last30Days[29 - daysDiff].applications++;
      }
    });

    const statusCounts: Record<string, number> = {};
    const companyCounts: Record<string, number> = {};

    apps.forEach((app) => {
      statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
      companyCounts[app.company] = (companyCounts[app.company] || 0) + 1;
    });

    const statusDistribution = Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
    }));

    const topCompanies = Object.entries(companyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({
        name,
        applications: value,
      }));

    setData({
      timeline: last30Days,
      statusDistribution,
      topCompanies,
      stats: {
        timeSaved: apps.length * 8,
        avgTime: apps.length > 0 ? Math.round(last30Days.reduce((sum, d) => sum + d.applications, 0) / (30 / 7)) : 0,
        applicationRate: ((apps.filter((a) => a.status === 'Interview').length / apps.length) * 100).toFixed(1),
      },
    });
  };

  const COLORS = ['#7C3AED', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Analytics</h1>
        <p className="text-slate-400 mt-1">Track your application performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Time Saved', value: `${data.stats.timeSaved}h`, icon: Clock, color: 'from-violet-600 to-violet-500' },
          { label: 'Weekly Average', value: `${data.stats.avgTime}`, icon: TrendingUp, color: 'from-cyan-600 to-cyan-500' },
          { label: 'Interview Rate', value: `${data.stats.applicationRate}%`, icon: Zap, color: 'from-green-600 to-green-500' },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6 hover:border-slate-600/50 transition group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-cyan-600/5" />
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">{stat.label}</p>
                  <p className={`text-4xl font-bold mt-2 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 bg-gradient-to-br ${stat.color} rounded-lg text-white/50 group-hover:text-white transition`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Applications Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(71, 85, 105, 0.2)" />
              <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(71, 85, 105, 0.5)',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Line
                type="monotone"
                dataKey="applications"
                stroke="#7C3AED"
                strokeWidth={3}
                dot={{ fill: '#7C3AED', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Applications by Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.statusDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {data.statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(71, 85, 105, 0.5)',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6"
      >
        <h2 className="text-lg font-semibold text-white mb-4">Top Companies</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.topCompanies}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(71, 85, 105, 0.2)" />
            <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px' }} angle={-45} textAnchor="end" height={80} />
            <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(71, 85, 105, 0.5)',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#e2e8f0' }}
            />
            <Bar dataKey="applications" fill="#7C3AED" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}
