'use client';

import { useState, useTransition } from "react";
import { Mail, Lock, User, Eye, EyeOff, Building2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { AivaLogo } from "../ui/AivaLogo";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { login, register } from "@/app/(auth)/actions";

export function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleLogin = (formData: FormData) => {
    startTransition(async () => {
      const result = await login(formData);
      if (result?.error) toast.error(result.error);
    });
  };

  const handleRegister = (formData: FormData) => {
    startTransition(async () => {
      const result = await register(formData);
      if (result?.error) {
        toast.error(result.error);
      } else if (result?.notice) {
        // Email-confirmation flow: no redirect happens, so surface the notice
        // and flip back to the login tab for when they return.
        toast.success(result.notice, { duration: 8000 });
        setIsLogin(true);
      }
    });
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2F80ED] via-[#56CCF2] to-[#27AE60] flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated background elements */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute top-10 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl"
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          rotate: [360, 180, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute bottom-10 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl"
      />

      <div className="w-full max-w-6xl relative z-10">
        <div
          className={`grid ${isLogin ? "lg:grid-cols-2" : "lg:grid-cols-2"} gap-8 items-center`}
        >
          {/* Left side - Branding or Form based on mode */}
          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.div
                key="branding-left"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.5 }}
                className="text-white space-y-8 hidden lg:flex flex-col justify-center items-center"
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex flex-col items-center gap-4"
                >
                  <AivaLogo className="w-32 h-32" />
                  <h1 className="text-6xl">Aiva</h1>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="form-left"
                initial={{ opacity: 0, rotateY: -90, x: 100 }}
                animate={{ opacity: 1, rotateY: 0, x: 0 }}
                exit={{ opacity: 0, rotateY: 90, x: -100 }}
                transition={{
                  duration: 0.2,
                  ease: [0.43, 0.13, 0.23, 0.96],
                }}
                style={{ transformStyle: "preserve-3d" }}
                className="hidden lg:flex justify-center"
              >
                <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 lg:p-12 w-full max-w-md">
                  {/* Tab selector at top */}
                  <div className="flex gap-2 mb-8 p-1 bg-gray-100 rounded-full">
                    <button
                      onClick={() => setIsLogin(false)}
                      className="flex-1 py-2 px-4 rounded-full text-sm font-medium bg-gradient-to-r from-[#27AE60] to-[#56CCF2] text-white"
                    >
                      Register
                    </button>
                    <button
                      onClick={() => setIsLogin(true)}
                      className="flex-1 py-2 px-4 rounded-full text-sm font-medium text-gray-600 hover:bg-white transition-all"
                    >
                      Login
                    </button>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <h2 className="text-3xl text-[#333333] mb-2">
                      Create Account
                    </h2>
                    <p className="text-gray-600 mb-8">
                      Register your clinic to get started
                    </p>

                    <form action={handleRegister} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                          <Input
                            id="name"
                            name="fullName"
                            type="text"
                            placeholder="Dr. Sarah Wilson"
                            className="pl-10 h-12"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">
                          Email Address
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="doctor@clinic.com"
                            className="pl-10 h-12"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="clinicName">Clinic Name</Label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                          <Input
                            id="clinicName"
                            name="clinicName"
                            type="text"
                            placeholder="Wilson Family Clinic"
                            className="pl-10 h-12"
                            required
                          />
                        </div>
                      </div>

                      <p className="text-xs text-gray-500 -mt-2">
                        You’ll add your clinic details, doctors, and team right
                        after — this just creates your account.
                      </p>

                      <div className="space-y-2">
                        <Label htmlFor="password">
                          Password
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                          <Input
                            id="password"
                            name="password"
                            minLength={8}
                            type={
                              showPassword ? "text" : "password"
                            }
                            placeholder="••••••••"
                            className="pl-10 pr-10 h-12"
                            required
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowPassword(!showPassword)
                            }
                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          type="submit"
                          disabled={isPending}
                          className="w-full h-12 text-lg bg-gradient-to-r from-[#27AE60] to-[#56CCF2] hover:opacity-90 shadow-lg"
                        >
                          {isPending ? "Creating…" : "Create Account"}
                        </Button>
                      </motion.div>
                    </form>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Right side - Form or Branding based on mode */}
          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.div
                key="form-right"
                initial={{ opacity: 0, rotateY: -90, x: 100 }}
                animate={{ opacity: 1, rotateY: 0, x: 0 }}
                exit={{ opacity: 0, rotateY: 90, x: -100 }}
                transition={{
                  duration: 0.2,
                  ease: [0.43, 0.13, 0.23, 0.96],
                }}
                style={{ transformStyle: "preserve-3d" }}
              >
                <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 lg:p-12">
                  {/* Logo for mobile */}
                  <div className="lg:hidden flex flex-col items-center gap-3 mb-8">
                    <AivaLogo className="w-16 h-16" />
                    <h1 className="text-3xl text-[#333333]">
                      Aiva
                    </h1>
                  </div>

                  {/* Tab selector at top */}
                  <div className="flex gap-2 mb-8 p-1 bg-gray-100 rounded-full">
                    <button
                      onClick={() => setIsLogin(false)}
                      className="flex-1 py-2 px-4 rounded-full text-sm font-medium text-gray-600 hover:bg-white transition-all"
                    >
                      Register
                    </button>
                    <button
                      onClick={() => setIsLogin(true)}
                      className="flex-1 py-2 px-4 rounded-full text-sm font-medium bg-gradient-to-r from-[#2F80ED] to-[#56CCF2] text-white"
                    >
                      Login
                    </button>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <h2 className="text-3xl text-[#333333] mb-2">
                      Welcome Back
                    </h2>
                    <p className="text-gray-600 mb-8">
                      Login to access your dashboard
                    </p>

                    <form action={handleLogin} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="email">
                          Email Address
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="doctor@clinic.com"
                            className="pl-10 h-12"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password">
                          Password
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                          <Input
                            id="password"
                            name="password"
                            type={
                              showPassword ? "text" : "password"
                            }
                            placeholder="••••••••"
                            className="pl-10 pr-10 h-12"
                            required
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowPassword(!showPassword)
                            }
                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Remember-me + Forgot password are intentionally
                          hidden until they're actually wired. Showing them
                          as no-ops trains users to expect features that
                          don't exist. Session lifetime is owned by Supabase
                          today; password reset will land in a follow-up. */}

                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          type="submit"
                          disabled={isPending}
                          className="w-full h-12 text-lg bg-gradient-to-r from-[#2F80ED] to-[#56CCF2] hover:opacity-90 shadow-lg"
                        >
                          {isPending ? "Signing in…" : "Login"}
                        </Button>
                      </motion.div>
                    </form>
                  </motion.div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="branding-right"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.5 }}
                className="text-white space-y-8 hidden lg:flex flex-col justify-center items-center"
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex flex-col items-center gap-4"
                >
                  <AivaLogo className="w-32 h-32" />
                  <h1 className="text-6xl">Aiva</h1>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}