'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { GraduationCap, AlertCircle, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const { user, loading, signInWithGoogle, isConfigured } = useAuth();
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError('Failed to sign in. Please try again.');
      console.error(err);
    } finally {
      setIsSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-indigo-100/50 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
      
      <div className="relative w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white mb-6 shadow-xl shadow-indigo-500/25">
            <GraduationCap className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">YMAU Training</h1>
          <p className="text-gray-500 mt-2">Yale Model African Union Training Platform</p>
        </div>

        <Card className="border-0 shadow-2xl shadow-indigo-100/50 bg-white/80 backdrop-blur">
          <CardContent className="p-8 space-y-6">
            {!isConfigured ? (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-5">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-amber-800 mb-2">Setup Required</h3>
                    <p className="text-sm text-amber-700 mb-3">
                      Firebase is not configured. To enable authentication:
                    </p>
                    <ol className="text-sm text-amber-700 list-decimal list-inside space-y-1.5">
                      <li>Create a Firebase project at console.firebase.google.com</li>
                      <li>Enable Google Authentication</li>
                      <li>Copy your Firebase config to .env.local</li>
                      <li>Restart the development server</li>
                    </ol>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <div className="inline-flex items-center gap-1.5 text-sm text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full mb-4">
                    <Sparkles className="h-3.5 w-3.5" />
                    Welcome back
                  </div>
                  <p className="text-gray-600">
                    Sign in to access training courses, track your progress, and earn certificates.
                  </p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-xl">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                <Button
                  onClick={handleSignIn}
                  isLoading={isSigningIn}
                  className="w-full h-12 text-base"
                  size="lg"
                >
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign in with Google
                </Button>

                <p className="text-center text-xs text-gray-400">
                  By signing in, you agree to participate in the YMAU training program.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-gray-400 mt-8">
          &copy; {new Date().getFullYear()} Yale Model African Union
        </p>
      </div>
    </div>
  );
}
