import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SetPasswordPage } from '@/components/pages/SetPasswordPage';

// Set-password gate for team members provisioned with a temp password.
// Unauthenticated users are sent to /auth; users who have already set a
// password go straight to the dashboard.
export default async function SetPasswordRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth');
  }

  if (!user.user_metadata?.must_change_password) {
    redirect('/dashboard');
  }

  return <SetPasswordPage />;
}
