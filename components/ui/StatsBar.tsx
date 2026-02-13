import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface Stat {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  change?: string;
}

interface StatsBarProps {
  stats: Stat[];
}

export function StatsBar({ stats }: StatsBarProps) {
  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-100">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="p-6 cursor-pointer transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-2">{stat.label}</p>
                  <div className="flex items-baseline gap-2">
                    <motion.p 
                      className="text-3xl text-[#333333]"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3 + index * 0.1, type: 'spring', stiffness: 200 }}
                    >
                      {stat.value}
                    </motion.p>
                    {stat.change && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        className="text-sm text-[#27AE60] font-medium"
                      >
                        {stat.change}
                      </motion.span>
                    )}
                  </div>
                </div>
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${stat.color}15` }}
                >
                  <Icon className="w-6 h-6" style={{ color: stat.color }} />
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
