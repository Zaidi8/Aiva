import { User, Building2, Bot, Bell, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';

export function SettingsPage() {
  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl text-[#333333]">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your clinic and system preferences</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 max-w-5xl mx-auto space-y-8">
        
        {/* Profile Settings */}
        <section>
          <h2 className="text-2xl text-[#333333] mb-6">Profile Settings</h2>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-[#2F80ED]" />
                Personal Information
              </CardTitle>
              <CardDescription>Update your personal and account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" defaultValue="John" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" defaultValue="Doe" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue="john.doe@clinic.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" defaultValue="555-0100" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select defaultValue="admin">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="doctor">Doctor</SelectItem>
                    <SelectItem value="receptionist">Receptionist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="bg-[#2F80ED] hover:bg-[#2F80ED]/90">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Clinic Settings */}
        <section>
          <h2 className="text-2xl text-[#333333] mb-6">Clinic Settings</h2>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#2F80ED]" />
                Clinic Information
              </CardTitle>
              <CardDescription>Manage your clinic details and operating hours</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="clinicName">Clinic Name</Label>
                <Input id="clinicName" defaultValue="City Medical Center" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" defaultValue="123 Healthcare Ave, Medical District" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clinicPhone">Phone</Label>
                  <Input id="clinicPhone" type="tel" defaultValue="555-0200" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinicEmail">Email</Label>
                  <Input id="clinicEmail" type="email" defaultValue="contact@citymedical.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hours">Operating Hours</Label>
                <Textarea 
                  id="hours" 
                  defaultValue="Monday - Friday: 8:00 AM - 6:00 PM&#10;Saturday: 9:00 AM - 2:00 PM&#10;Sunday: Closed"
                  rows={4}
                />
              </div>
              <Button className="bg-[#2F80ED] hover:bg-[#2F80ED]/90">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* AI Settings */}
        <section>
          <h2 className="text-2xl text-[#333333] mb-6">AI Receptionist Settings</h2>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-[#2F80ED]" />
                  AI Configuration
                </CardTitle>
                <CardDescription>Customize your AI virtual assistant behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="aiName">AI Assistant Name</Label>
                  <Input id="aiName" defaultValue="Aiva" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="greeting">Greeting Message</Label>
                  <Textarea 
                    id="greeting" 
                    defaultValue="Good morning! Thank you for calling City Medical Center. How can I help you today?"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Default Language</Label>
                  <Select defaultValue="en">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="bg-[#2F80ED] hover:bg-[#2F80ED]/90">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Capabilities</CardTitle>
                <CardDescription>Enable or disable AI features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#F7F9FB] rounded-lg">
                  <div>
                    <p className="text-[#333333]">Appointment Booking</p>
                    <p className="text-sm text-gray-600">Allow AI to schedule new appointments</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 bg-[#F7F9FB] rounded-lg">
                  <div>
                    <p className="text-[#333333]">Appointment Rescheduling</p>
                    <p className="text-sm text-gray-600">Allow AI to modify existing appointments</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 bg-[#F7F9FB] rounded-lg">
                  <div>
                    <p className="text-[#333333]">Cancellations</p>
                    <p className="text-sm text-gray-600">Allow AI to cancel appointments</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between p-4 bg-[#F7F9FB] rounded-lg">
                  <div>
                    <p className="text-[#333333]">Emergency Transfers</p>
                    <p className="text-sm text-gray-600">Auto-transfer emergency calls to staff</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Notification Settings */}
        <section>
          <h2 className="text-2xl text-[#333333] mb-6">Notification Settings</h2>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#2F80ED]" />
                Automated Notifications
              </CardTitle>
              <CardDescription>Configure automatic patient reminders and alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#F7F9FB] rounded-lg">
                <div>
                  <p className="text-[#333333]">Appointment Reminders</p>
                  <p className="text-sm text-gray-600">Send reminders 24 hours before appointments</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-4 bg-[#F7F9FB] rounded-lg">
                <div>
                  <p className="text-[#333333]">Confirmation Messages</p>
                  <p className="text-sm text-gray-600">Send confirmation after booking</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-4 bg-[#F7F9FB] rounded-lg">
                <div>
                  <p className="text-[#333333]">Follow-up Surveys</p>
                  <p className="text-sm text-gray-600">Request feedback after appointments</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-4 bg-[#F7F9FB] rounded-lg">
                <div>
                  <p className="text-[#333333]">SMS Notifications</p>
                  <p className="text-sm text-gray-600">Send text message reminders</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-4 bg-[#F7F9FB] rounded-lg">
                <div>
                  <p className="text-[#333333]">Email Notifications</p>
                  <p className="text-sm text-gray-600">Send email reminders and updates</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </section>

      </div>
    </div>
  );
}
