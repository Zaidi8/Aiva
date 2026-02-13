import { toast } from 'sonner';
import { Calendar, Clock, XCircle, ThumbsUp, Bot, MessageSquare, ArrowRight, Plus } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { TopBar } from '../ui/TopBar';
import { StatsBar } from '../ui/StatsBar';
import { DevControls } from '../ui/DevControls';
import { NewAppointmentModal } from '../ui/NewAppointmentModal';
import { motion } from 'motion/react';
import { mockAppointments } from '../../data/mockData';
import { useState } from 'react';
import { useNotificationSound } from '../../hooks/useNotificationSound';
import { AppointmentToast } from '../ui/AppointmentToast';

interface NewDashboardPageProps {
  onNavigate?: (page: string, subPage?: string) => void;
}

export function NewDashboardPage({ onNavigate }: NewDashboardPageProps) {
  const [showEmptyState, setShowEmptyState] = useState(false);
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);
  const { playNotificationSound } = useNotificationSound();

  const stats = [
    {
      label: "Today's Appointments",
      value: 24,
      icon: Calendar,
      color: '#2F80ED',
      change: '+3',
    },
    {
      label: 'Pending Approvals',
      value: 7,
      icon: Clock,
      color: '#F2994A',
    },
    {
      label: 'Cancellations',
      value: 3,
      icon: XCircle,
      color: '#EB5757',
    },
    {
      label: 'Patient Satisfaction',
      value: '4.6',
      icon: ThumbsUp,
      color: '#27AE60',
    },
  ];

  const handleTestNotification = () => {
    playNotificationSound();
    toast.custom((t) => (
      <AppointmentToast
        patientName="John Smith"
        time="3:00 PM Today"
        doctor="Dr. Williams"
      />
    ), {
      duration: 4000,
    });
  };

  const recentAppointments = showEmptyState ? [] : mockAppointments.slice(0, 4);

  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      <TopBar
        title="Dashboard"
        actionButton={
          <Button
            className="bg-gradient-to-r from-[#2F80ED] to-[#56CCF2] hover:opacity-90 shadow-md"
            onClick={() => setIsNewAppointmentModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Appointment
          </Button>
        }
      />

      <div className="p-6 max-w-7xl mx-auto space-y-8">
        {/* Stats Bar */}
        <StatsBar stats={stats} />

        {/* AI Status Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-[#2F80ED] to-[#56CCF2] text-white overflow-hidden border-none shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-8">
              <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    >
                      <Bot className="w-10 h-10" />
                    </motion.div>
                    <h2 className="text-2xl">AI Receptionist</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-3 h-3 bg-white rounded-full"
                    />
                    <span className="text-sm opacity-90">Online & Active</span>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  onClick={() => onNavigate?.('ai-receptionist')}
                >
                  View Details
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Chats Handled Today', value: '47', icon: MessageSquare },
                  { label: 'Bookings Made', value: '32', icon: Calendar },
                  { label: 'Success Rate', value: '94%', icon: ThumbsUp },
                ].map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="bg-white/10 backdrop-blur rounded-xl p-5 border border-white/20 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <stat.icon className="w-4 h-4 opacity-80" />
                      <p className="text-sm opacity-80">{stat.label}</p>
                    </div>
                    <p className="text-3xl">{stat.value}</p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Appointments */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl text-[#333333]">Today's Appointments</h2>
            <Button
              variant="outline"
              size="sm"
              className="hover:bg-[#2F80ED] hover:text-white transition-all"
              onClick={() => onNavigate?.('appointments')}
            >
              View All
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {recentAppointments.length === 0 ? (
            <Card className="border-2 border-dashed border-gray-300">
              <CardContent className="p-12 text-center">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl text-gray-600 mb-2">No Appointments Today</h3>
                <p className="text-gray-500 mb-6">
                  No appointments are scheduled for today. Add a new appointment to get started.
                </p>
                <Button
                  className="bg-[#2F80ED] hover:bg-[#2F80ED]/90"
                  onClick={() => setIsNewAppointmentModalOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Appointment
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="space-y-3">
                  {recentAppointments.map((apt, index) => (
                    <motion.div
                      key={apt.id}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02, x: 5 }}
                      className="flex items-center justify-between p-4 bg-[#F7F9FB] rounded-xl hover:bg-gray-100 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#2F80ED] to-[#56CCF2] rounded-full flex items-center justify-center text-white shadow-md">
                          {apt.patient.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-[#333333] font-medium">{apt.patient}</p>
                          <p className="text-sm text-gray-600">{apt.doctor}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <p className="text-sm text-gray-600">{apt.time}</p>
                          <p className="text-xs text-gray-500">{apt.type}</p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            apt.status === 'confirmed'
                              ? 'bg-[#27AE60]/10 text-[#27AE60]'
                              : apt.status === 'pending'
                              ? 'bg-[#F2994A]/10 text-[#F2994A]'
                              : apt.status === 'completed'
                              ? 'bg-[#2F80ED]/10 text-[#2F80ED]'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {apt.status}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <h2 className="text-2xl text-[#333333] mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                label: 'New Appointment',
                icon: Plus,
                gradient: 'from-[#2F80ED] to-[#56CCF2]',
                action: () => setIsNewAppointmentModalOpen(true),
              },
              {
                label: 'View Calendar',
                icon: Calendar,
                gradient: 'from-[#56CCF2] to-[#27AE60]',
                action: () => onNavigate?.('appointments'),
              },
              {
                label: 'AI Settings',
                icon: Bot,
                gradient: 'from-[#27AE60] to-[#2F80ED]',
                action: () => onNavigate?.('settings', 'ai'),
              },
            ].map((action, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  className={`h-24 w-full bg-gradient-to-r ${action.gradient} hover:opacity-90 flex-col gap-3 shadow-md hover:shadow-lg transition-all`}
                  onClick={action.action}
                >
                  <action.icon className="w-7 h-7" />
                  <span className="text-base">{action.label}</span>
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Dev Controls */}
      <DevControls
        onEmptyStateToggle={() => setShowEmptyState(!showEmptyState)}
        onTestNotification={handleTestNotification}
        currentPage={1}
        totalPages={5}
      />

      <NewAppointmentModal
        isOpen={isNewAppointmentModalOpen}
        onClose={() => setIsNewAppointmentModalOpen(false)}
      />
    </div>
  );
}