import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Save, Loader as Loader2 } from 'lucide-react';
import { Database } from '../../lib/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Partial<Profile> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (data) {
      setProfile(data);
    } else {
      setProfile({
        id: user.id,
        full_name: '',
        email: user.email || '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        country: '',
        linkedin_url: '',
        portfolio_url: '',
        github_url: '',
        summary: '',
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user || !profile) return;

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .upsert(profile)
      .eq('id', user.id);

    if (!error) {
      loadProfile();
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!profile) return null;

  const fields = [
    { key: 'full_name', label: 'Full Name', type: 'text' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Phone', type: 'tel' },
    { key: 'address', label: 'Address', type: 'text' },
    { key: 'city', label: 'City', type: 'text' },
    { key: 'state', label: 'State', type: 'text' },
    { key: 'zip_code', label: 'ZIP Code', type: 'text' },
    { key: 'country', label: 'Country', type: 'text' },
    { key: 'linkedin_url', label: 'LinkedIn URL', type: 'url' },
    { key: 'portfolio_url', label: 'Portfolio URL', type: 'url' },
    { key: 'github_url', label: 'GitHub URL', type: 'url' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Profile Setup</h1>
          <p className="text-slate-400 mt-1">Manage your professional information</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-lg hover:shadow-lg hover:shadow-violet-500/50 transition-all font-semibold disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              <span>Save Profile</span>
            </>
          )}
        </motion.button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl p-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {fields.map((field, idx) => (
            <motion.div
              key={field.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {field.label}
              </label>
              <input
                type={field.type}
                value={profile[field.key as keyof Profile] as string || ''}
                onChange={(e) => setProfile({ ...profile, [field.key]: e.target.value })}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition"
              />
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-6"
        >
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Professional Summary
          </label>
          <textarea
            value={profile.summary || ''}
            onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
            rows={5}
            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition resize-none"
            placeholder="Write a brief professional summary about yourself..."
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
