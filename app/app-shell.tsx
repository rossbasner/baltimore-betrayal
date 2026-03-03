// @ts-nocheck
'use client';

import Navigation from '@/components/Navigation';
import MurderAnnouncement from '@/components/MurderAnnouncement';
import type { UserRole } from '@/lib/types';

interface AppShellProps {
  children: React.ReactNode;
  userRole: UserRole;
  votingActive?: boolean;
}

export default function AppShell({ children, userRole, votingActive }: AppShellProps) {
  const isHostOrAdmin = userRole === 'host' || userRole === 'admin';

  return (
    <div className="min-h-screen bg-betrayal-black bg-atmospheric">
      <MurderAnnouncement />
      <main
        className={`pb-20 ${isHostOrAdmin ? 'pt-10' : 'pt-0'}`}
        style={{ minHeight: '100dvh' }}
      >
        {children}
      </main>
      <Navigation userRole={userRole} votingActive={votingActive} />
    </div>
  );
}
