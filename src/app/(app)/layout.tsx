import { redirect } from 'next/navigation';
import { getPrincipal } from '@/lib/principal';
import Shell from './shell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const principal = await getPrincipal();
  if (!principal) redirect('/login');
  return <Shell principal={principal}>{children}</Shell>;
}