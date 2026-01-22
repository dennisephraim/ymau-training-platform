'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from '@/types/user';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import * as userService from '@/lib/services/users';
import {
  Plus,
  X,
  Search,
  UserPlus,
  Users,
  Crown,
  Loader2,
} from 'lucide-react';

interface InstructorPickerProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  createdById?: string; // The original creator (cannot be removed)
  currentUserId?: string; // The current user (to prevent self-assignment)
  disabled?: boolean;
  label?: string;
}

export function InstructorPicker({
  selectedIds,
  onChange,
  createdById,
  currentUserId,
  disabled = false,
  label = 'Additional Instructors',
}: InstructorPickerProps) {
  const [showModal, setShowModal] = useState(false);
  const [availableInstructors, setAvailableInstructors] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch available instructors and admins
  const fetchInstructors = useCallback(async () => {
    try {
      setLoading(true);
      const instructors = await userService.getInstructorsAndAdmins();
      setAvailableInstructors(instructors);
    } catch (error) {
      console.error('Error fetching instructors:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch selected users details
  const fetchSelectedUsers = useCallback(async () => {
    if (selectedIds.length === 0) {
      setSelectedUsers([]);
      return;
    }

    try {
      const usersMap = await userService.getUsersByIds(selectedIds);
      setSelectedUsers(Array.from(usersMap.values()));
    } catch (error) {
      console.error('Error fetching selected users:', error);
    }
  }, [selectedIds]);

  useEffect(() => {
    fetchSelectedUsers();
  }, [fetchSelectedUsers]);

  const handleOpenModal = () => {
    fetchInstructors();
    setShowModal(true);
    setSearchQuery('');
  };

  const handleAddInstructor = (user: User) => {
    if (!selectedIds.includes(user.id)) {
      onChange([...selectedIds, user.id]);
    }
  };

  const handleRemoveInstructor = (userId: string) => {
    // Don't allow removing the creator
    if (userId === createdById) return;
    onChange(selectedIds.filter((id) => id !== userId));
  };

  // Filter available instructors based on search
  const filteredInstructors = availableInstructors.filter((instructor) => {
    // Exclude already selected
    if (selectedIds.includes(instructor.id)) return false;
    // Exclude the creator (they have access by default)
    if (instructor.id === createdById) return false;
    // Exclude the current user (can't add yourself as co-instructor)
    if (instructor.id === currentUserId) return false;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        instructor.displayName.toLowerCase().includes(query) ||
        instructor.email.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Users className="h-4 w-4" />
          {label}
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleOpenModal}
          disabled={disabled}
        >
          <UserPlus className="h-4 w-4 mr-1" />
          Add Instructor
        </Button>
      </div>

      {/* Selected Instructors */}
      {selectedUsers.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-2 bg-gray-100 rounded-full pl-1 pr-2 py-1"
            >
              <Avatar
                src={user.photoURL}
                fallback={user.displayName}
                size="xs"
              />
              <span className="text-sm text-gray-700">{user.displayName}</span>
              {user.id !== createdById && !disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveInstructor(user.id)}
                  className="p-0.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              {user.id === createdById && (
                <span title="Course Creator">
                  <Crown className="h-3 w-3 text-ymau-orange" />
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 italic">
          No additional instructors assigned
        </p>
      )}

      {/* Add Instructor Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add Instructor"
      >
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-ymau-dark-red focus:outline-none focus:ring-1 focus:ring-ymau-dark-red"
            />
          </div>

          {/* Instructor List */}
          <div className="max-h-64 overflow-y-auto space-y-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : filteredInstructors.length === 0 ? (
              <p className="text-center py-8 text-gray-500 text-sm">
                {searchQuery
                  ? 'No instructors found matching your search'
                  : 'No more instructors available to add'}
              </p>
            ) : (
              filteredInstructors.map((instructor) => (
                <button
                  key={instructor.id}
                  type="button"
                  onClick={() => {
                    handleAddInstructor(instructor);
                    setShowModal(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <Avatar
                    src={instructor.photoURL}
                    fallback={instructor.displayName}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {instructor.displayName}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {instructor.email}
                    </p>
                  </div>
                  <Badge
                    variant={instructor.role === 'admin' ? 'warning' : 'info'}
                    size="sm"
                  >
                    {instructor.role}
                  </Badge>
                </button>
              ))
            )}
          </div>

          {/* Already Selected Note */}
          {selectedUsers.length > 0 && (
            <div className="pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Currently assigned: {selectedUsers.map((u) => u.displayName).join(', ')}
              </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
