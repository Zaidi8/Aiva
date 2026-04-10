import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { StatsBar } from '../ui/StatsBar';
import { TopBar } from '../ui/TopBar';
import { CallRecord } from '../ui/CallRecord';
import { PaginationBar } from '../ui/PaginationBar';
import { AppointmentToast } from '../ui/AppointmentToast';
import { 
  Calendar, 
  Users, 
  Bot, 
  MessageSquare, 
  CheckCircle, 
  AlertCircle, 
  Info,
  TrendingUp,
  Clock,
  XCircle,
  Plus
} from 'lucide-react';
import { AivaLogo } from '../ui/AivaLogo';
import { motion } from 'motion/react';
import { useState } from 'react';
import { useNotificationSound } from '../../hooks/useNotificationSound';

interface NewUIKitPageProps {
  onNavigate?: (page: string) => void;
}

export function NewUIKitPage({ onNavigate }: NewUIKitPageProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const { playNotificationSound } = useNotificationSound();

  const sampleTranscript = [
    { id: '1', speaker: 'ai' as const, text: 'Hello! How can I help you today?', timestamp: '00:00', duration: '0:03' },
    { id: '2', speaker: 'patient' as const, text: 'I need to book an appointment', timestamp: '00:10', duration: '0:02' },
    { id: '3', speaker: 'ai' as const, text: 'I\'d be happy to help you schedule an appointment.', timestamp: '00:15', duration: '0:04' },
  ];

  const statsBarData = [
    { label: 'Appointments', value: 24, icon: Calendar, color: '#2F80ED', change: '+3' },
    { label: 'Pending', value: 7, icon: Clock, color: '#F2994A' },
    { label: 'Cancellations', value: 3, icon: XCircle, color: '#EB5757' },
    { label: 'Satisfaction', value: '4.6', icon: CheckCircle, color: '#27AE60' },
  ];

  const handleToastDemo = () => {
    playNotificationSound();
    toast.custom((t) => (
      <AppointmentToast
        patientName="Sarah Johnson"
        time="2:30 PM Today"
        doctor="Dr. Martinez"
      />
    ), {
      duration: 4000,
    });
  };

  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      <TopBar 
        title="UI Kit" 
        description="Design system components and style guide for Aiva"
        notificationCount={5}
      />

      <div className="p-8 max-w-7xl mx-auto space-y-12">
        {/* Brand Identity */}
        <section>
          <motion.h2 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-2xl text-[#333333] mb-6"
          >
            Brand Identity
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>Logo</CardTitle>
                  <CardDescription>Aiva - AI Virtual Assistant</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 p-6 bg-[#F7F9FB] rounded-lg">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                    >
                      <AivaLogo className="w-20 h-20" />
                    </motion.div>
                    <div>
                      <p className="text-2xl text-[#333333] mb-1">Aiva</p>
                      <p className="text-sm text-gray-500">AI Virtual Assistant</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>Color Palette</CardTitle>
                  <CardDescription>Primary brand colors</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { name: 'Primary Blue', color: '#2F80ED' },
                      { name: 'Light Blue', color: '#56CCF2' },
                      { name: 'Success Green', color: '#27AE60' },
                      { name: 'Warning Orange', color: '#F2994A' },
                      { name: 'Error Red', color: '#EB5757' },
                      { name: 'Background', color: '#F7F9FB' },
                    ].map((item, index) => (
                      <motion.div 
                        key={item.name} 
                        className="space-y-2"
                        whileHover={{ scale: 1.05 }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 + index * 0.05 }}
                      >
                        <div
                          className="h-16 rounded-lg border border-gray-200 shadow-sm"
                          style={{ backgroundColor: item.color }}
                        />
                        <div className="text-sm">
                          <p className="text-gray-900">{item.name}</p>
                          <p className="text-gray-500 text-xs">{item.color}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* Custom Components */}
        <section>
          <motion.h2 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-2xl text-[#333333] mb-6"
          >
            Custom Components
          </motion.h2>
          <div className="space-y-6">
            {/* Stats Bar */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>Stats Bar</CardTitle>
                  <CardDescription>Minimalistic statistics display with hover effects</CardDescription>
                </CardHeader>
                <CardContent>
                  <StatsBar stats={statsBarData} />
                </CardContent>
              </Card>
            </motion.div>

            {/* Call Transcript */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>Call Record</CardTitle>
                  <CardDescription>AI voice call transcript with call quality and sentiment analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <CallRecord
                    transcript={sampleTranscript}
                    patientName="John Smith"
                    duration="2:15"
                    callQuality={5}
                    sentiment="positive"
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Pagination */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>Pagination Bar</CardTitle>
                  <CardDescription>Full-featured pagination with page controls</CardDescription>
                </CardHeader>
                <CardContent>
                  <PaginationBar
                    currentPage={currentPage}
                    totalPages={10}
                    onPageChange={setCurrentPage}
                    itemsPerPage={10}
                    totalItems={95}
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Toast Notifications */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>Toast Notifications</CardTitle>
                  <CardDescription>Real-time notifications with sound alerts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={handleToastDemo}>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Appointment Toast
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => toast.success('Action completed successfully!')}
                    >
                      Success Toast
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => toast.error('An error occurred')}
                    >
                      Error Toast
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => toast.info('This is an informational message')}
                    >
                      Info Toast
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* Buttons */}
        <section>
          <motion.h2 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-2xl text-[#333333] mb-6"
          >
            Buttons
          </motion.h2>
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="space-y-6">
                <div>
                  <Label className="mb-3 block">Primary Buttons</Label>
                  <div className="flex flex-wrap gap-3">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button className="bg-[#2F80ED] hover:bg-[#2F80ED]/90">Primary</Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button className="bg-gradient-to-r from-[#2F80ED] to-[#56CCF2]">Gradient</Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button className="bg-[#27AE60] hover:bg-[#27AE60]/90">Success</Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="destructive">Destructive</Button>
                    </motion.div>
                  </div>
                </div>
                <div>
                  <Label className="mb-3 block">Secondary Buttons</Label>
                  <div className="flex flex-wrap gap-3">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="outline">Outline</Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="secondary">Secondary</Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="ghost">Ghost</Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="link">Link</Button>
                    </motion.div>
                  </div>
                </div>
                <div>
                  <Label className="mb-3 block">Icon Buttons</Label>
                  <div className="flex flex-wrap gap-3">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        With Icon
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="outline" size="icon">
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Badges */}
        <section>
          <motion.h2 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-2xl text-[#333333] mb-6"
          >
            Badges
          </motion.h2>
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <Label className="mb-3 block">Status Badges</Label>
                  <div className="flex flex-wrap gap-3">
                    <Badge className="bg-[#27AE60]/10 text-[#27AE60] hover:bg-[#27AE60]/20">Confirmed</Badge>
                    <Badge className="bg-[#F2994A]/10 text-[#F2994A] hover:bg-[#F2994A]/20">Pending</Badge>
                    <Badge className="bg-[#2F80ED]/10 text-[#2F80ED] hover:bg-[#2F80ED]/20">Completed</Badge>
                    <Badge className="bg-[#EB5757]/10 text-[#EB5757] hover:bg-[#EB5757]/20">Cancelled</Badge>
                  </div>
                </div>
                <div>
                  <Label className="mb-3 block">Outline Badges</Label>
                  <div className="flex flex-wrap gap-3">
                    <Badge variant="outline">Default</Badge>
                    <Badge variant="outline">Secondary</Badge>
                    <Badge variant="outline">Info</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Forms */}
        <section>
          <motion.h2 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-2xl text-[#333333] mb-6"
          >
            Form Elements
          </motion.h2>
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="space-y-6 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="demo-input">Input Field</Label>
                  <Input id="demo-input" placeholder="Enter text..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demo-input-icon">Input with Icon</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <Input id="demo-input-icon" placeholder="Search..." className="pl-10" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Alerts */}
        <section>
          <motion.h2 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-2xl text-[#333333] mb-6"
          >
            Alerts
          </motion.h2>
          <div className="space-y-4">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Alert className="bg-[#2F80ED]/10 border-[#2F80ED]">
                <Info className="w-4 h-4 text-[#2F80ED]" />
                <AlertDescription className="text-[#2F80ED]">
                  This is an informational alert message.
                </AlertDescription>
              </Alert>
            </motion.div>
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Alert className="bg-[#27AE60]/10 border-[#27AE60]">
                <CheckCircle className="w-4 h-4 text-[#27AE60]" />
                <AlertDescription className="text-[#27AE60]">
                  This is a success alert message.
                </AlertDescription>
              </Alert>
            </motion.div>
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Alert className="bg-[#EB5757]/10 border-[#EB5757]">
                <AlertCircle className="w-4 h-4 text-[#EB5757]" />
                <AlertDescription className="text-[#EB5757]">
                  This is an error alert message.
                </AlertDescription>
              </Alert>
            </motion.div>
          </div>
        </section>

        {/* Cards */}
        <section>
          <motion.h2 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-2xl text-[#333333] mb-6"
          >
            Cards
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Calendar, label: 'Appointments', value: '24', gradient: 'from-[#2F80ED] to-[#56CCF2]' },
              { icon: Users, label: 'Patients', value: '156', gradient: 'from-[#56CCF2] to-[#27AE60]' },
              { icon: Bot, label: 'AI Calls', value: '47', gradient: 'from-[#27AE60] to-[#2F80ED]' },
            ].map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
              >
                <Card className={`bg-gradient-to-br ${item.gradient} text-white border-none shadow-lg`}>
                  <CardContent className="p-6">
                    <item.icon className="w-8 h-8 mb-4" />
                    <p className="text-3xl mb-2">{item.value}</p>
                    <p className="text-sm opacity-90">{item.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}