// @ts-nocheck
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-betrayal-black flex flex-col items-center justify-center px-4 text-center">
      <div className="text-8xl mb-6 opacity-20">🗡️</div>
      <p className="font-cinzel text-xs uppercase tracking-[0.4em] text-betrayal-muted mb-4">
        Nothing to see here
      </p>
      <h1 className="font-cinzel text-4xl font-black text-betrayal-text mb-6">
        404
      </h1>
      <p className="text-betrayal-muted text-sm mb-8 max-w-xs">
        This page does not exist — or perhaps it never did.
      </p>
      <Link href="/" className="btn-ghost">
        Return to the Manor
      </Link>
    </div>
  );
}
