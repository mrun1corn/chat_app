'use client'
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';
import React, { Suspense, lazy } from 'react';

const Auth = lazy(() => import('./components/Auth'));
const Chat = lazy(() => import('./components/Chat'));

export default function Home() {
  const [user, loading] = useAuthState(auth);

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main>
      <Suspense fallback={<div>Loading...</div>}>
        {user ? <Chat /> : <Auth />}
      </Suspense>
    </main>
  );
}