'use client';

import { useState, useTransition } from 'react';
import { Lock, Eye, EyeOff, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { AivaLogo } from '../ui/AivaLogo';
import { cn } from '../ui/utils';
import { toast } from 'sonner';
import { setPassword } from '@/app/(auth)/actions';

export function SetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await setPassword(formData);
      if (result?.error) toast.error(result.error);
    });
  };

  const toggleButton = (
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
      {/* ── Brand panel (matches login) ── */}
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
            Let’s secure your account
          </h1>
          <p className="text-lg leading-relaxed text-sidebar-foreground">
            Since this is a temporary password, choose a new one before you
            start using the dashboard.
          </p>
          <ul className="space-y-3">
            {['8+ characters', 'Known only to you', 'Required before continuing'].map(
              (f) => (
                <li
                  key={f}
                  className="flex items-center gap-3 text-sidebar-foreground"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
                    <Check className="size-3.5" />
                  </span>
                  {f}
                </li>
              ),
            )}
          </ul>
        </div>
        <p className="relative text-sm text-sidebar-foreground/70">
          Powered by Aiva.
        </p>
      </div>

      {/* ── Form panel ── */}
      <div className="flex items-center justify-center bg-background p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <AivaLogo className="size-10" />
            <span className="text-2xl font-semibold tracking-tight text-foreground">
              Aiva
            </span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Set a new password
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Choose a password you’ll remember. You’ll use it to sign in from
              now on.
            </p>
          </div>

          <form action={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={cn('pl-9', 'pr-10')}
                />
                {toggleButton}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={cn('pl-9', 'pr-10')}
                />
                {toggleButton}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              At least 8 characters. You’ll be redirected to the dashboard once
              it’s saved.
            </p>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isPending}
            >
              {isPending ? 'Saving…' : 'Save new password'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
