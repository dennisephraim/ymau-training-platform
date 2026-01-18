'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect to unified explore page
export default function BrowseCoursesPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/dashboard/enroll');
  }, [router]);

  return (
    <div className="flex justify-center items-center min-h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  );
}
