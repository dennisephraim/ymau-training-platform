'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect to my activities page
export default function BrowseCoursesPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/dashboard/courses');
  }, [router]);

  return (
    <div className="flex justify-center items-center min-h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ymau-dark-red"></div>
    </div>
  );
}