'use client';

import { NewLoginPage } from '@/components/pages/NewLoginPage';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = () => {
    router.push('/dashboard');
  };

  return <NewLoginPage onLogin={handleLogin} />;
}
