'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Camera, Upload, X } from 'lucide-react';
import { uploadProfilePicture } from '@/lib/services/storage';
import { updateUserProfile } from '@/lib/services/users';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const roleLabels = {
    student: 'Student',
    instructor: 'Instructor',
    admin: 'Administrator',
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setError(null);
    setUploading(true);
    setUploadProgress(0);

    try {
      const photoURL = await uploadProfilePicture(user.id, file, (progress) => {
        setUploadProgress(Math.round(progress.progress));
      });

      await updateUserProfile(user.id, { photoURL });
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Failed to upload profile picture');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage your account settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Your account information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="relative group">
              <Avatar
                src={user?.photoURL}
                fallback={user?.displayName || user?.email}
                size="xl"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <div className="text-white text-sm font-medium">{uploadProgress}%</div>
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{user?.displayName}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              <X className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="pt-4 border-t border-gray-200">
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Role</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {user && roleLabels[user.role]}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Account Status</dt>
                <dd className="text-sm font-medium text-green-600">
                  {user?.isActive ? 'Active' : 'Inactive'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Member Since</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {user?.createdAt.toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Account management options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Account settings are managed through your Google account. Contact an administrator if you need to change your role or account status.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
