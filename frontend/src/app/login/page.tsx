'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

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
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-blue-600 text-white text-2xl font-bold">
            Y
          </div>
          <CardTitle className="text-2xl">Welcome to YMAU Training</CardTitle>
          <CardDescription>
            Yale Model African Union Training Platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConfigured ? (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
              <h3 className="font-medium text-yellow-800 mb-2">Setup Required</h3>
              <p className="text-sm text-yellow-700 mb-2">
                Firebase is not configured. To enable authentication:
              </p>
              <ol className="text-sm text-yellow-700 list-decimal list-inside space-y-1">
                <li>Create a Firebase project at console.firebase.google.com</li>
                <li>Enable Google Authentication</li>
                <li>Copy your Firebase config to .env.local</li>
                <li>Restart the development server</li>
              </ol>
            </div>
          ) : (
            <>
              <p className="text-center text-sm text-gray-600">
                Sign in with your Google account to access training courses, track your progress, and earn certificates.
              </p>

              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <Button
                onClick={handleSignIn}
                isLoading={isSigningIn}
                className="w-full"
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

              <p className="text-center text-xs text-gray-500">
                By signing in, you agree to participate in the YMAU training program.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
