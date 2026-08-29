'use client';

import { useState, useTransition } from 'react';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Building2,
  Check,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { AivaLogo } from '../ui/AivaLogo';
import { cn } from '../ui/utils';
import { toast } from 'sonner';
import { login, register } from '@/app/(auth)/actions';

const FEATURES = [
  'AI receptionist for every incoming call',
  'Automated booking, reschedule & cancellation',
  'Patient records and schedules in one place',
];

// Icon-prefixed text field. Defined outside the component so it isn't
// re-created each render; the password toggle is passed in via `trailing`
// (it needs the parent's showPassword state).
function Field({
  id,
  name,
  label,
  type = 'text',
  placeholder,
  icon: Icon,
  required,
  minLength,
  autoComplete,
  trailing,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  icon: LucideIcon;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          className={cn('pl-9', trailing && 'pr-10')}
        />
        {trailing}
      </div>
    </div>
  );
}

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

  const passwordToggle = (
    <button
      type="button"
      onClick={() => setShowPassword((s) => !s)}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
      aria-label={showPassword ? 'Hide password' : 'Show password'}
    >
      {showPassword ? (
        <EyeOff className="size-4" />
      ) : (
        <Eye className="size-4" />
      )}
    </button>
  );

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* ── Brand panel — matches the deep-indigo sidebar rail ── */}
      <div className="relative hidden overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-white/5 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-20 size-[28rem] rounded-full bg-white/5 blur-3xl"
        />

        <div className="relative flex items-center gap-3">
          <AivaLogo className="size-11" />
          <span className="text-2xl font-semibold tracking-tight text-white">
            Aiva
          </span>
        </div>

        <div className="relative max-w-md space-y-6">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white">
            The AI receptionist your clinic deserves
          </h1>
          <p className="text-lg leading-relaxed text-sidebar-foreground">
            Aiva answers every call, books and reschedules appointments, and
            keeps your patient records in sync — so your front desk never misses
            a patient.
          </p>
          <ul className="space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sidebar-foreground">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
                  <Check className="size-3.5" />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-sidebar-foreground/70">
          Trusted to handle patient calls around the clock.
        </p>
      </div>

      {/* ── Form panel ── */}
      <div className="flex items-center justify-center bg-background p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* Logo for mobile (brand panel is hidden below lg) */}
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <AivaLogo className="size-10" />
            <span className="text-2xl font-semibold tracking-tight text-foreground">
              Aiva
            </span>
          </div>

          {/* Segmented Login / Register toggle */}
          <div className="mb-8 inline-flex w-full rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={cn(
                'flex-1 rounded-md py-2 text-sm font-medium transition-colors',
                isLogin
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={cn(
                'flex-1 rounded-md py-2 text-sm font-medium transition-colors',
                !isLogin
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Register
            </button>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {isLogin ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {isLogin
                ? 'Log in to access your clinic dashboard.'
                : 'Register your clinic to get started with Aiva.'}
            </p>
          </div>

          {isLogin ? (
            <form action={handleLogin} className="space-y-5">
              <Field
                id="email"
                name="email"
                label="Email address"
                type="email"
                placeholder="doctor@clinic.com"
                icon={Mail}
                required
                autoComplete="email"
              />
              <Field
                id="password"
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                icon={Lock}
                required
                autoComplete="current-password"
                trailing={passwordToggle}
              />

              {/* Remember-me + Forgot password are intentionally hidden until
                  they're actually wired. Showing them as no-ops trains users to
                  expect features that don't exist. Session lifetime is owned by
                  Supabase today; password reset will land in a follow-up. */}

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isPending}
              >
                {isPending ? 'Signing in…' : 'Log in'}
              </Button>
            </form>
          ) : (
            <form action={handleRegister} className="space-y-5">
              <Field
                id="name"
                name="fullName"
                label="Full name"
                placeholder="Dr. Sarah Wilson"
                icon={User}
                required
                autoComplete="name"
              />
              <Field
                id="email"
                name="email"
                label="Email address"
                type="email"
                placeholder="doctor@clinic.com"
                icon={Mail}
                required
                autoComplete="email"
              />
              <Field
                id="clinicName"
                name="clinicName"
                label="Clinic name"
                placeholder="Wilson Family Clinic"
                icon={Building2}
                required
                autoComplete="organization"
              />
              <p className="text-xs text-muted-foreground">
                You’ll add your clinic details, doctors, and team right after —
                this just creates your account.
              </p>
              <Field
                id="password"
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                icon={Lock}
                required
                minLength={8}
                autoComplete="new-password"
                trailing={passwordToggle}
              />
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isPending}
              >
                {isPending ? 'Creating…' : 'Create account'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
