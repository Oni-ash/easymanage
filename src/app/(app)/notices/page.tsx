import { getPrincipal } from '@/lib/principal';
import NoticesList from './notices-list';

export default async function NoticesPage() {
  const principal = await getPrincipal();
  if (!principal) return null;

  return <NoticesList principal={principal} />;
}