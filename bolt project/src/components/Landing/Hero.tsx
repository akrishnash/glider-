import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

export default function Hero({ onGetStarted }: { onGetStarted: () => void }) {
  const fields = [
    { name: 'Full Name', delay: 0.1 },
    { name: 'Email', delay: 0.3 },
    { name: 'Phone', delay: 0.5 },
    { name: 'Experience', delay: 0.7 },
    { name: 'Skills', delay: 0.9 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 -left-32 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 -right-32 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col lg:flex-row items-center justify-between gap-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex-1 text-center lg:text-left"
        >
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-white via-violet-200 to-cyan-300 bg-clip-text text-transparent mb-6"
          >
            Apply to 100 jobs in 10 minutes
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto lg:mx-0"
          >
            AI fills every form. You just review and submit. ApplyAI watches, learns, and optimizes each application.
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onGetStarted}
            className="px-8 py-4 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-lg font-semibold text-lg hover:shadow-2xl hover:shadow-violet-500/50 transition-all duration-300 inline-flex items-center space-x-3 group relative overflow-hidden"
          >
            <span className="relative z-10 flex items-center space-x-3">
              <Zap className="h-5 w-5" />
              <span>Add to Chrome — It's Free</span>
            </span>
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-violet-400 to-cyan-400 opacity-0 group-hover:opacity-30 blur"
              animate={{ opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-12 flex flex-wrap gap-6 justify-center lg:justify-start"
          >
            <div className="text-center">
              <p className="text-3xl font-bold text-violet-400">10M+</p>
              <p className="text-slate-400">Forms Filled</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-cyan-400">95%</p>
              <p className="text-slate-400">Accuracy</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-violet-400">500h+</p>
              <p className="text-slate-400">Time Saved</p>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex-1 relative"
        >
          <div className="relative w-full max-w-md mx-auto">
            <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-cyan-600/10" />

              <div className="relative z-10 space-y-4">
                {fields.map((field, idx) => (
                  <motion.div
                    key={field.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: field.delay }}
                    className="flex items-center space-x-3"
                  >
                    <div className="flex-1">
                      <p className="text-sm text-slate-400 mb-2">{field.name}</p>
                      <motion.div
                        className="h-10 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-lg overflow-hidden"
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ delay: field.delay + 0.2, duration: 0.5 }}
                      >
                        <motion.div
                          className="h-full bg-slate-700 rounded-lg"
                          animate={{ x: ['0%', '100%'] }}
                          transition={{
                            delay: field.delay + 0.2,
                            duration: 1,
                            repeat: Infinity,
                          }}
                        />
                      </motion.div>
                    </div>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: field.delay + 0.6 }}
                      className="text-green-400 text-lg"
                    >
                      ✓
                    </motion.div>
                  </motion.div>
                ))}
              </div>
            </div>

            <motion.div
              className="absolute -bottom-4 -right-4 w-24 h-24 bg-cyan-500/20 rounded-full blur-2xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            <motion.div
              className="absolute -top-4 -left-4 w-24 h-24 bg-violet-500/20 rounded-full blur-2xl"
              animate={{ scale: [1.2, 1, 1.2] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16"
      >
        <p className="text-center text-slate-400 mb-8 font-semibold">TRUSTED BY LEADING PLATFORMS</p>
        <div className="flex flex-wrap justify-center items-center gap-8">
          {['Greenhouse', 'Lever', 'Workday', 'LinkedIn'].map((platform, idx) => (
            <motion.div
              key={platform}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 + idx * 0.1 }}
              className="text-slate-500 font-semibold text-lg hover:text-violet-400 transition-colors"
            >
              {platform}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
