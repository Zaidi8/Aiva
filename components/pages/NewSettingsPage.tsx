import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { User, Bell, Lock, Bot, Palette, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { TopBar } from '../ui/TopBar';
import { Textarea } from '../ui/textarea';
import { motion } from 'motion/react';

interface NewSettingsPageProps {
  onNavigate?: (page: string) => void;
  initialTab?: string;
}

export function NewSettingsPage({ onNavigate, initialTab = 'profile' }: NewSettingsPageProps) {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleSave = () => {
    toast.success('Settings saved successfully!', {
      description: 'Your changes have been applied.',
    });
  };

  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      <TopBar
        title="Settings"
        description="Manage your account and application preferences"
        notificationCount={0}
      />

      <div className="p-8 max-w-5xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">AI Settings</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Appearance</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Settings */}
          <TabsContent value="profile">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your personal and clinic information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" defaultValue="Dr. Sarah Wilson" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" defaultValue="sarah.wilson@clinic.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" defaultValue="+1 (555) 123-4567" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Input id="role" defaultValue="Admin" disabled />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clinic">Clinic Name</Label>
                    <Input id="clinic" defaultValue="City Medical Center" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Clinic Address</Label>
                    <Textarea
                      id="address"
                      defaultValue="123 Healthcare Boulevard, Suite 200, Medical District, City, State 12345"
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleSave} className="bg-[#2F80ED] hover:bg-[#2F80ED]/90">
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>Choose how you want to be notified</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {[
                    {
                      label: 'New Appointments',
                      description: 'Get notified when new appointments are booked',
                      defaultChecked: true,
                    },
                    {
                      label: 'Appointment Cancellations',
                      description: 'Receive alerts for cancelled appointments',
                      defaultChecked: true,
                    },
                    {
                      label: 'AI Call Notifications',
                      description: 'Notifications for AI receptionist call activity',
                      defaultChecked: true,
                    },
                    {
                      label: 'Daily Summary',
                      description: 'Receive daily summary emails',
                      defaultChecked: false,
                    },
                    {
                      label: 'System Updates',
                      description: 'Get notified about system updates and maintenance',
                      defaultChecked: true,
                    },
                  ].map((setting, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-[#F7F9FB] rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-[#333333]">{setting.label}</p>
                        <p className="text-sm text-gray-600">{setting.description}</p>
                      </div>
                      <Switch defaultChecked={setting.defaultChecked} />
                    </div>
                  ))}
                  <Button onClick={handleSave} className="bg-[#2F80ED] hover:bg-[#2F80ED]/90">
                    <Save className="w-4 h-4 mr-2" />
                    Save Preferences
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>Update your password to keep your account secure</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input id="current-password" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input id="new-password" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input id="confirm-password" type="password" />
                  </div>
                  <Button onClick={handleSave} className="bg-[#2F80ED] hover:bg-[#2F80ED]/90">
                    <Save className="w-4 h-4 mr-2" />
                    Update Password
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Two-Factor Authentication</CardTitle>
                  <CardDescription>Add an extra layer of security to your account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[#F7F9FB] rounded-lg">
                    <div>
                      <p className="font-medium text-[#333333]">Enable 2FA</p>
                      <p className="text-sm text-gray-600">Secure your account with two-factor authentication</p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* AI Settings */}
          <TabsContent value="ai">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle>AI Receptionist Configuration</CardTitle>
                  <CardDescription>Customize your AI assistant's behavior</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="ai-name">AI Assistant Name</Label>
                    <Input id="ai-name" defaultValue="Aiva" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="greeting">Greeting Message</Label>
                    <Textarea
                      id="greeting"
                      defaultValue="Hello! Welcome to City Medical Center. I'm Aiva, your AI virtual assistant. How may I help you today?"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-4">
                    {[
                      {
                        label: 'Auto-Book Appointments',
                        description: 'Allow AI to automatically book appointments',
                        defaultChecked: true,
                      },
                      {
                        label: 'Send Confirmations',
                        description: 'Automatically send appointment confirmations',
                        defaultChecked: true,
                      },
                      {
                        label: 'Handle Rescheduling',
                        description: 'Let AI manage appointment rescheduling',
                        defaultChecked: true,
                      },
                      {
                        label: 'Emergency Transfers',
                        description: 'Transfer emergency cases to staff immediately',
                        defaultChecked: true,
                      },
                    ].map((setting, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-[#F7F9FB] rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-[#333333]">{setting.label}</p>
                          <p className="text-sm text-gray-600">{setting.description}</p>
                        </div>
                        <Switch defaultChecked={setting.defaultChecked} />
                      </div>
                    ))}
                  </div>
                  <Button onClick={handleSave} className="bg-[#2F80ED] hover:bg-[#2F80ED]/90">
                    <Save className="w-4 h-4 mr-2" />
                    Save AI Settings
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Theme & Display</CardTitle>
                  <CardDescription>Customize the look and feel of your dashboard</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    {[
                      {
                        label: 'Dark Mode',
                        description: 'Enable dark mode for better viewing in low light',
                        defaultChecked: false,
                      },
                      {
                        label: 'Compact View',
                        description: 'Show more information in less space',
                        defaultChecked: false,
                      },
                      {
                        label: 'Animations',
                        description: 'Enable smooth transitions and animations',
                        defaultChecked: true,
                      },
                    ].map((setting, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-[#F7F9FB] rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-[#333333]">{setting.label}</p>
                          <p className="text-sm text-gray-600">{setting.description}</p>
                        </div>
                        <Switch defaultChecked={setting.defaultChecked} />
                      </div>
                    ))}
                  </div>
                  <Button onClick={handleSave} className="bg-[#2F80ED] hover:bg-[#2F80ED]/90">
                    <Save className="w-4 h-4 mr-2" />
                    Save Appearance
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}