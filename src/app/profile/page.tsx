import React, { Suspense, lazy } from 'react';

const Profile = lazy(() => import('../components/Profile'));

export default function ProfilePage() {
  return (
    <Suspense fallback={<div>Loading Profile...</div>}>
      <Profile />
    </Suspense>
  );
}
