import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Calendar, 
  Users, 
  Bot, 
  Bell, 
  CheckCircle, 
  AlertCircle, 
  Info,
  XCircle,
  TrendingUp
} from 'lucide-react';
import { AivaLogo } from '../ui/AivaLogo';

export function UIKitPage() {
  return (
    <div className="min-h-screen bg-[#F7F9FB] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl text-[#333333] mb-3">UI Kit</h1>
          <p className="text-gray-600 text-lg">Design system components and style guide for Aiva</p>
        </div>

        {/* Brand Section */}
        <section className="mb-16">
          <h2 className="text-2xl text-[#333333] mb-6">Brand Identity</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Logo</CardTitle>
                <CardDescription>Aiva - AI Virtual Assistant</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 p-6 bg-[#F7F9FB] rounded-lg">
                  <AivaLogo className="w-20 h-20" />
                  <div>
                    <p className="text-2xl text-[#333333] mb-1">Aiva</p>
                    <p className="text-sm text-gray-500">AI Virtual Assistant</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Color Palette</CardTitle>
                <CardDescription>Primary colors used throughout the application</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="h-16 bg-[#2F80ED] rounded-lg"></div>
                    <p className="text-sm text-gray-600">Primary Blue</p>
                    <p className="text-xs font-mono text-gray-500">#2F80ED</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-16 bg-[#56CCF2] rounded-lg"></div>
                    <p className="text-sm text-gray-600">Light Blue</p>
                    <p className="text-xs font-mono text-gray-500">#56CCF2</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-16 bg-[#27AE60] rounded-lg"></div>
                    <p className="text-sm text-gray-600">Accent Green</p>
                    <p className="text-xs font-mono text-gray-500">#27AE60</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-16 bg-[#F7F9FB] border border-gray-200 rounded-lg"></div>
                    <p className="text-sm text-gray-600">Background</p>
                    <p className="text-xs font-mono text-gray-500">#F7F9FB</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Typography Section */}
        <section className="mb-16">
          <h2 className="text-2xl text-[#333333] mb-6">Typography</h2>
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div>
                <h1 className="text-4xl text-[#333333] mb-2">Heading 1</h1>
                <p className="text-sm text-gray-500">text-4xl - Used for main page titles</p>
              </div>
              <div>
                <h2 className="text-2xl text-[#333333] mb-2">Heading 2</h2>
                <p className="text-sm text-gray-500">text-2xl - Used for section headings</p>
              </div>
              <div>
                <h3 className="text-xl text-[#333333] mb-2">Heading 3</h3>
                <p className="text-sm text-gray-500">text-xl - Used for card titles</p>
              </div>
              <div>
                <p className="text-base text-[#333333] mb-2">Body Text - Regular</p>
                <p className="text-sm text-gray-500">text-base - Primary body text</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Small Text - Secondary information</p>
                <p className="text-sm text-gray-500">text-sm - Supporting text</p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Buttons Section */}
        <section className="mb-16">
          <h2 className="text-2xl text-[#333333] mb-6">Buttons</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-gray-600 mb-3">Primary Buttons</p>
                  <div className="flex flex-wrap gap-3">
                    <Button className="bg-[#2F80ED] hover:bg-[#2F80ED]/90">
                      Primary Button
                    </Button>
                    <Button className="bg-[#2F80ED] hover:bg-[#2F80ED]/90" size="sm">
                      Small Button
                    </Button>
                    <Button className="bg-[#2F80ED] hover:bg-[#2F80ED]/90" size="lg">
                      Large Button
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-3">Outline Buttons</p>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline">Outline Button</Button>
                    <Button variant="outline" size="sm">Small Outline</Button>
                    <Button variant="outline" size="lg">Large Outline</Button>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-3">With Icons</p>
                  <div className="flex flex-wrap gap-3">
                    <Button className="bg-[#2F80ED] hover:bg-[#2F80ED]/90">
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule Appointment
                    </Button>
                    <Button variant="outline">
                      <Users className="w-4 h-4 mr-2" />
                      View Patients
                    </Button>
                    <Button className="bg-[#27AE60] hover:bg-[#27AE60]/90">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirm
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Badges Section */}
        <section className="mb-16">
          <h2 className="text-2xl text-[#333333] mb-6">Badges & Status Indicators</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <Badge className="bg-[#27AE60]/10 text-[#27AE60] hover:bg-[#27AE60]/20">
                    Confirmed
                  </Badge>
                  <Badge className="bg-[#F2994A]/10 text-[#F2994A] hover:bg-[#F2994A]/20">
                    Pending
                  </Badge>
                  <Badge className="bg-[#EB5757]/10 text-[#EB5757] hover:bg-[#EB5757]/20">
                    Cancelled
                  </Badge>
                  <Badge className="bg-gray-200 text-gray-600 hover:bg-gray-300">
                    Completed
                  </Badge>
                  <Badge className="bg-[#2F80ED]/10 text-[#2F80ED] hover:bg-[#2F80ED]/20">
                    Active
                  </Badge>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-3">Status with Icons</p>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 px-3 py-1 bg-[#27AE60]/10 text-[#27AE60] rounded-full">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">Online</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-[#F2994A]/10 text-[#F2994A] rounded-full">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">Attention Required</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-[#EB5757]/10 text-[#EB5757] rounded-full">
                      <XCircle className="w-4 h-4" />
                      <span className="text-sm">Offline</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Cards Section */}
        <section className="mb-16">
          <h2 className="text-2xl text-[#333333] mb-6">Cards & Containers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-l-4 border-l-[#2F80ED]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Stat Card</CardTitle>
                  <Calendar className="w-5 h-5 text-[#2F80ED]" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl text-[#333333] mb-1">24</div>
                <p className="text-sm text-gray-600">With accent border</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Regular Card</CardTitle>
                <CardDescription>With description</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Standard card layout with header and content sections</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[#2F80ED] to-[#56CCF2] text-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Gradient Card</CardTitle>
                  <Bot className="w-5 h-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl mb-1">94%</div>
                <p className="text-sm opacity-90">Success Rate</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Form Elements */}
        <section className="mb-16">
          <h2 className="text-2xl text-[#333333] mb-6">Form Elements</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="max-w-md space-y-4">
                <div>
                  <Label htmlFor="text-input">Text Input</Label>
                  <Input 
                    id="text-input" 
                    type="text" 
                    placeholder="Enter text here" 
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email-input">Email Input</Label>
                  <Input 
                    id="email-input" 
                    type="email" 
                    placeholder="email@example.com" 
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="disabled-input">Disabled Input</Label>
                  <Input 
                    id="disabled-input" 
                    type="text" 
                    placeholder="Disabled" 
                    disabled 
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Alerts Section */}
        <section className="mb-16">
          <h2 className="text-2xl text-[#333333] mb-6">Alerts & Notifications</h2>
          <div className="space-y-4">
            <Alert className="border-l-4 border-l-[#27AE60] bg-[#27AE60]/5">
              <CheckCircle className="h-4 w-4 text-[#27AE60]" />
              <AlertDescription className="text-[#27AE60]">
                Success! Your appointment has been scheduled successfully.
              </AlertDescription>
            </Alert>

            <Alert className="border-l-4 border-l-[#2F80ED] bg-[#2F80ED]/5">
              <Info className="h-4 w-4 text-[#2F80ED]" />
              <AlertDescription className="text-[#2F80ED]">
                Information: You have 3 pending appointments to review.
              </AlertDescription>
            </Alert>

            <Alert className="border-l-4 border-l-[#F2994A] bg-[#F2994A]/5">
              <AlertCircle className="h-4 w-4 text-[#F2994A]" />
              <AlertDescription className="text-[#F2994A]">
                Warning: Please update your AI receptionist settings.
              </AlertDescription>
            </Alert>

            <Alert className="border-l-4 border-l-[#EB5757] bg-[#EB5757]/5">
              <XCircle className="h-4 w-4 text-[#EB5757]" />
              <AlertDescription className="text-[#EB5757]">
                Error: Failed to connect to the server. Please try again.
              </AlertDescription>
            </Alert>
          </div>
        </section>

        {/* Icons Section */}
        <section className="mb-16">
          <h2 className="text-2xl text-[#333333] mb-6">Common Icons</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-4 md:grid-cols-8 gap-6">
                <div className="flex flex-col items-center gap-2">
                  <Calendar className="w-6 h-6 text-[#2F80ED]" />
                  <p className="text-xs text-gray-600">Calendar</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Users className="w-6 h-6 text-[#2F80ED]" />
                  <p className="text-xs text-gray-600">Users</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Bot className="w-6 h-6 text-[#2F80ED]" />
                  <p className="text-xs text-gray-600">Bot</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Bell className="w-6 h-6 text-[#2F80ED]" />
                  <p className="text-xs text-gray-600">Bell</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-[#27AE60]" />
                  <p className="text-xs text-gray-600">Check</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <AlertCircle className="w-6 h-6 text-[#F2994A]" />
                  <p className="text-xs text-gray-600">Alert</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <XCircle className="w-6 h-6 text-[#EB5757]" />
                  <p className="text-xs text-gray-600">Close</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-[#27AE60]" />
                  <p className="text-xs text-gray-600">Trending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Spacing Guidelines */}
        <section className="mb-16">
          <h2 className="text-2xl text-[#333333] mb-6">Spacing System</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 text-sm text-gray-600">4px (1)</div>
                  <div className="h-8 w-1 bg-[#2F80ED]"></div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-20 text-sm text-gray-600">8px (2)</div>
                  <div className="h-8 w-2 bg-[#2F80ED]"></div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-20 text-sm text-gray-600">12px (3)</div>
                  <div className="h-8 w-3 bg-[#2F80ED]"></div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-20 text-sm text-gray-600">16px (4)</div>
                  <div className="h-8 w-4 bg-[#2F80ED]"></div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-20 text-sm text-gray-600">24px (6)</div>
                  <div className="h-8 w-6 bg-[#2F80ED]"></div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-20 text-sm text-gray-600">32px (8)</div>
                  <div className="h-8 w-8 bg-[#2F80ED]"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
