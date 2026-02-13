import { useState } from 'react';
import { Bot, Mail, Lock, Building2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { AivaLogo } from '../ui/AivaLogo';

interface LoginPageProps {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2F80ED] via-[#56CCF2] to-[#27AE60] flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <div className="text-white space-y-6 hidden md:block">
          <div className="flex items-center gap-4">
            <AivaLogo className="w-20 h-20" />
            <div>
              <h1 className="text-4xl mb-1">Aiva</h1>
              <p className="text-lg text-white/90">AI Virtual Assistant</p>
              <p className="text-sm text-white/70">Healthcare Management System</p>
            </div>
          </div>
          
          <div className="space-y-4 mt-12">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl mb-2">AI-Powered Reception</h3>
                <p className="text-white/80">Automated appointment scheduling and patient communication</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl mb-2">Clinic Management</h3>
                <p className="text-white/80">Complete oversight of appointments and patient records</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login/Register Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="mb-6">
            <h2 className="text-2xl text-[#333333] mb-2">Welcome Back</h2>
            <p className="text-gray-600">Login to manage your clinic</p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={(e) => { e.preventDefault(); onLogin(); }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="doctor@clinic.com"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-gray-600">Remember me</span>
                  </label>
                  <a href="#" className="text-[#2F80ED] hover:underline">Forgot password?</a>
                </div>

                <Button type="submit" className="w-full bg-[#2F80ED] hover:bg-[#2F80ED]/90">
                  Login
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={(e) => { e.preventDefault(); onLogin(); }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clinic-name">Clinic Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <Input
                      id="clinic-name"
                      type="text"
                      placeholder="City Medical Center"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="admin@clinic.com"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full bg-[#27AE60] hover:bg-[#27AE60]/90">
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}