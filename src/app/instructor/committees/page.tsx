'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import {
  Plus,
  UsersRound,
  Trash2,
  ArrowLeft,
  Search,
  UserMinus,
  UserPlus,
  Loader2,
  Pencil,
  Key,
  Copy,
  X,
} from 'lucide-react';
import { Committee } from '@/types/committee';
import { CommitteeCode } from '@/types/committeeCode';
import { User } from '@/types/user';
import { useAuth } from '@/components/auth/AuthContext';
import * as committeeService from '@/lib/services/committees';
import * as committeeCodeService from '@/lib/services/committeeCodes';
import * as userService from '@/lib/services/users';
import { formatRelativeTime } from '@/lib/utils/formatters';

interface CommitteeFormFields {
  name: string;
  description: string;
  chairperson: string;
  languageLevel: string;
}

const emptyFormFields: CommitteeFormFields = {
  name: '',
  description: '',
  chairperson: '',
  languageLevel: '',
};

export default function CommitteesPage() {
  const { user } = useAuth();
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Committee codes state
  const [committeeCodes, setCommitteeCodes] = useState<CommitteeCode[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);

  // Committee list state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFields, setCreateFields] = useState<CommitteeFormFields>(emptyFormFields);
  const [creating, setCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; memberCount: number } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit modal state
  const [editCommittee, setEditCommittee] = useState<Committee | null>(null);
  const [editFields, setEditFields] = useState<CommitteeFormFields>(emptyFormFields);
  const [saving, setSaving] = useState(false);

  // Member view state
  const [selectedCommittee, setSelectedCommittee] = useState<Committee | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [addingStudents, setAddingStudents] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [committeesData, studentsData] = await Promise.all([
        committeeService.getAllCommittees(),
        userService.getUsersByRole('student'),
      ]);
      setCommittees(committeesData);
      setAllStudents(studentsData);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get member count for a committee
  const getMemberCount = (committeeId: string) => {
    return allStudents.filter((s) => s.committeeId === committeeId).length;
  };

  // Fetch members and codes when a committee is selected
  const selectCommittee = useCallback(
    async (committee: Committee) => {
      setSelectedCommittee(committee);
      setLoadingMembers(true);
      const committeeMembers = allStudents.filter(
        (s) => s.committeeId === committee.id
      );
      setMembers(committeeMembers);
      setLoadingMembers(false);

      // Fetch committee codes
      setLoadingCodes(true);
      try {
        const codes = await committeeCodeService.getCommitteeCodes(committee.id);
        setCommitteeCodes(codes);
      } catch (err) {
        console.error('Error fetching committee codes:', err);
      } finally {
        setLoadingCodes(false);
      }
    },
    [allStudents]
  );

  // Create committee
  const handleCreate = async () => {
    if (!createFields.name.trim()) return;

    try {
      setCreating(true);
      await committeeService.createCommittee({
        name: createFields.name.trim(),
        description: createFields.description.trim(),
        chairperson: createFields.chairperson.trim(),
        languageLevel: createFields.languageLevel.trim(),
      });
      setCreateFields(emptyFormFields);
      setShowCreateModal(false);
      await fetchData();
    } catch (err) {
      console.error('Error creating committee:', err);
    } finally {
      setCreating(false);
    }
  };

  // Edit committee
  const openEditModal = (committee: Committee) => {
    setEditCommittee(committee);
    setEditFields({
      name: committee.name,
      description: committee.description,
      chairperson: committee.chairperson,
      languageLevel: committee.languageLevel,
    });
  };

  const handleEdit = async () => {
    if (!editCommittee || !editFields.name.trim()) return;

    try {
      setSaving(true);
      await committeeService.updateCommittee(editCommittee.id, {
        name: editFields.name.trim(),
        description: editFields.description.trim(),
        chairperson: editFields.chairperson.trim(),
        languageLevel: editFields.languageLevel.trim(),
      });
      setEditCommittee(null);
      await fetchData();
      // If we're in member detail view, update the selected committee
      if (selectedCommittee?.id === editCommittee.id) {
        setSelectedCommittee((prev) =>
          prev
            ? {
                ...prev,
                name: editFields.name.trim(),
                description: editFields.description.trim(),
                chairperson: editFields.chairperson.trim(),
                languageLevel: editFields.languageLevel.trim(),
              }
            : null
        );
      }
    } catch (err) {
      console.error('Error updating committee:', err);
    } finally {
      setSaving(false);
    }
  };

  // Delete committee
  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      setDeleting(true);
      await committeeService.deleteCommittee(deleteConfirm.id);
      setDeleteConfirm(null);
      if (selectedCommittee?.id === deleteConfirm.id) {
        setSelectedCommittee(null);
        setMembers([]);
      }
      await fetchData();
    } catch (err) {
      console.error('Error deleting committee:', err);
    } finally {
      setDeleting(false);
    }
  };

  // Remove student from committee
  const handleRemoveMember = async (userId: string) => {
    try {
      await userService.assignUserCommittee(userId, null);
      // Update local state
      setMembers((prev) => prev.filter((m) => m.id !== userId));
      setAllStudents((prev) =>
        prev.map((s) => (s.id === userId ? { ...s, committeeId: null } : s))
      );
    } catch (err) {
      console.error('Error removing member:', err);
    }
  };

  // Add students to committee
  const handleAddStudents = async () => {
    if (!selectedCommittee || selectedStudentIds.size === 0) return;

    try {
      setAddingStudents(true);
      await Promise.all(
        Array.from(selectedStudentIds).map((id) =>
          userService.assignUserCommittee(id, selectedCommittee.id)
        )
      );
      // Update local state
      setAllStudents((prev) =>
        prev.map((s) =>
          selectedStudentIds.has(s.id)
            ? { ...s, committeeId: selectedCommittee.id }
            : s
        )
      );
      const newMembers = allStudents.filter((s) => selectedStudentIds.has(s.id));
      setMembers((prev) => [
        ...prev,
        ...newMembers.map((s) => ({ ...s, committeeId: selectedCommittee.id })),
      ]);
      setSelectedStudentIds(new Set());
      setSearchQuery('');
      setShowAddModal(false);
    } catch (err) {
      console.error('Error adding students:', err);
    } finally {
      setAddingStudents(false);
    }
  };

  // Committee code handlers
  const handleCreateCode = async () => {
    if (!user || !selectedCommittee) return;
    try {
      await committeeCodeService.createCommitteeCode(selectedCommittee.id, user.id);
      const codes = await committeeCodeService.getCommitteeCodes(selectedCommittee.id);
      setCommitteeCodes(codes);
    } catch (err) {
      console.error('Error creating code:', err);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const handleDeactivateCode = async (codeId: string) => {
    if (!selectedCommittee) return;
    try {
      await committeeCodeService.deactivateCommitteeCode(codeId);
      const codes = await committeeCodeService.getCommitteeCodes(selectedCommittee.id);
      setCommitteeCodes(codes);
    } catch (err) {
      console.error('Error deactivating code:', err);
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    if (!selectedCommittee) return;
    if (!confirm('Are you sure you want to delete this committee code?')) return;
    try {
      await committeeCodeService.deleteCommitteeCode(codeId);
      const codes = await committeeCodeService.getCommitteeCodes(selectedCommittee.id);
      setCommitteeCodes(codes);
    } catch (err) {
      console.error('Error deleting code:', err);
    }
  };

  // Available students (not in this committee)
  const availableStudents = allStudents.filter(
    (s) => s.committeeId !== selectedCommittee?.id
  );

  // Filtered available students based on search
  const filteredAvailable = searchQuery
    ? availableStudents.filter(
        (s) =>
          s.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : availableStudents;

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Committee form fields component (shared between create and edit modals)
  const renderFormFields = (
    fields: CommitteeFormFields,
    setFields: (fields: CommitteeFormFields) => void,
    autoFocusName?: boolean
  ) => (
    <div className="space-y-4">
      <Input
        label="Committee Name"
        value={fields.name}
        onChange={(e) => setFields({ ...fields, name: e.target.value })}
        placeholder="e.g., Security Council"
        autoFocus={autoFocusName}
      />
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Description / Topic
        </label>
        <textarea
          value={fields.description}
          onChange={(e) => setFields({ ...fields, description: e.target.value })}
          placeholder="Brief description of the committee topic..."
          rows={3}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-ymau-dark-red focus:outline-none focus:ring-1 focus:ring-ymau-dark-red"
        />
      </div>
      <Input
        label="Chairperson"
        value={fields.chairperson}
        onChange={(e) => setFields({ ...fields, chairperson: e.target.value })}
        placeholder="e.g., John Smith"
      />
      <Input
        label="Language Level"
        value={fields.languageLevel}
        onChange={(e) => setFields({ ...fields, languageLevel: e.target.value })}
        placeholder="e.g., Intermediate French"
      />
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-ymau-dark-red" />
      </div>
    );
  }

  // Member detail view
  if (selectedCommittee) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Breadcrumb + Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedCommittee(null);
              setMembers([]);
            }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <button
                onClick={() => {
                  setSelectedCommittee(null);
                  setMembers([]);
                }}
                className="hover:text-ymau-dark-red transition-colors"
              >
                Committees
              </button>
              <span>/</span>
              <span className="text-gray-900 font-medium">{selectedCommittee.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{selectedCommittee.name}</h1>
              <button
                onClick={() => openEditModal(selectedCommittee)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-ymau-dark-red hover:bg-ymau-dark-red/10 transition-all"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
            {/* Committee metadata */}
            {(selectedCommittee.description || selectedCommittee.chairperson || selectedCommittee.languageLevel) && (
              <div className="mt-2 space-y-1">
                {selectedCommittee.description && (
                  <p className="text-sm text-gray-600">{selectedCommittee.description}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {selectedCommittee.chairperson && (
                    <p className="text-xs text-gray-500">
                      <span className="font-medium">Chairperson:</span> {selectedCommittee.chairperson}
                    </p>
                  )}
                  {selectedCommittee.languageLevel && (
                    <p className="text-xs text-gray-500">
                      <span className="font-medium">Language Level:</span> {selectedCommittee.languageLevel}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Students
          </Button>
        </div>

        {/* Members & Join Codes Tabs */}
        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members">
              <UsersRound className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Members</span>
            </TabsTrigger>
            <TabsTrigger value="codes">
              <Key className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Join Codes</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-6">
            {loadingMembers ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-ymau-dark-red" />
              </div>
            ) : members.length === 0 ? (
              <Card className="border-dashed border-2 border-gray-300 bg-gray-50">
                <CardContent className="py-12">
                  <EmptyState
                    icon={<UsersRound className="h-8 w-8" />}
                    title="No Students Assigned"
                    description="Add students to this committee to get started."
                    action={
                      <Button onClick={() => setShowAddModal(true)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Students
                      </Button>
                    }
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Members
                    <Badge variant="info" size="sm">{members.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={member.photoURL}
                            fallback={member.displayName || member.email}
                            size="sm"
                          />
                          <div>
                            <p className="font-medium text-gray-900">
                              {member.displayName || 'No Name'}
                            </p>
                            <p className="text-sm text-gray-500">{member.email}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <UserMinus className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="codes" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Key className="h-5 w-5 mr-2" />
                      Join Codes
                    </CardTitle>
                    <CardDescription>
                      Create and manage join codes for students to self-join this committee
                    </CardDescription>
                  </div>
                  <Button onClick={handleCreateCode} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Code
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingCodes ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-ymau-dark-red" />
                  </div>
                ) : committeeCodes.length === 0 ? (
                  <div className="text-center py-8">
                    <Key className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No Join Codes</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      Create a code to allow students to self-join this committee.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {committeeCodes.map((code) => (
                      <div
                        key={code.id}
                        className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg border ${
                          code.isActive ? 'bg-white border-gray-200' : 'bg-gray-100 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="font-mono text-lg font-bold tracking-wider text-ymau-dark-red">
                            {code.code}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopyCode(code.code)}
                            aria-label="Copy code"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                          <div className="text-left sm:text-right text-sm min-w-0">
                            <p className="text-gray-500">
                              Used {code.useCount}{code.maxUses ? ` / ${code.maxUses}` : ''} times
                            </p>
                            <p className="text-xs text-gray-400">
                              Created {formatRelativeTime(code.createdAt)}
                            </p>
                          </div>
                          <Badge variant={code.isActive ? 'success' : 'default'} className="shrink-0">
                            {code.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <div className="flex gap-1 shrink-0">
                            {code.isActive && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeactivateCode(code.id)}
                                className="text-gray-500 hover:text-gray-700"
                                aria-label="Deactivate code"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCode(code.id)}
                              className="text-red-500 hover:text-red-700"
                              aria-label="Delete code"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Students Modal */}
        <Modal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setSearchQuery('');
            setSelectedStudentIds(new Set());
          }}
          title="Add Students"
          size="lg"
        >
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="max-h-80 overflow-y-auto space-y-1">
              {filteredAvailable.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-4">
                  {searchQuery ? 'No students found' : 'No available students'}
                </p>
              ) : (
                filteredAvailable.map((student) => (
                  <label
                    key={student.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.has(student.id)}
                      onChange={() => toggleStudentSelection(student.id)}
                      className="h-4 w-4 rounded border-gray-300 text-ymau-dark-red focus:ring-ymau-dark-red"
                    />
                    <Avatar
                      src={student.photoURL}
                      fallback={student.displayName || student.email}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {student.displayName || 'No Name'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{student.email}</p>
                    </div>
                    {student.committeeId && (
                      <span className="text-xs text-gray-400 italic shrink-0">
                        In another committee
                      </span>
                    )}
                  </label>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                {selectedStudentIds.size} selected
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setSearchQuery('');
                    setSelectedStudentIds(new Set());
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddStudents}
                  disabled={selectedStudentIds.size === 0 || addingStudents}
                  isLoading={addingStudents}
                >
                  Add ({selectedStudentIds.size})
                </Button>
              </div>
            </div>
          </div>
        </Modal>

        {/* Edit Committee Modal */}
        <Modal
          isOpen={!!editCommittee}
          onClose={() => setEditCommittee(null)}
          title="Edit Committee"
          size="md"
        >
          <div className="space-y-4">
            {renderFormFields(editFields, setEditFields)}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditCommittee(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleEdit}
                disabled={!editFields.name.trim() || saving}
                isLoading={saving}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // Committee list view
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Committees</h1>
          <p className="text-gray-500 mt-1">
            Manage committees and assign students
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Committee
        </Button>
      </div>

      {/* Committee Grid */}
      {committees.length === 0 ? (
        <Card className="border-dashed border-2 border-ymau-dark-red/30 bg-ymau-dark-red/5">
          <CardContent className="py-12">
            <EmptyState
              icon={<UsersRound className="h-8 w-8" />}
              title="No Committees Yet"
              description="Create committees to organize students into groups."
              action={
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Committee
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {committees.map((committee) => {
            const memberCount = getMemberCount(committee.id);
            return (
              <Card
                key={committee.id}
                className="hover:border-ymau-dark-red/30 transition-colors cursor-pointer group relative"
                onClick={() => selectCommittee(committee)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 rounded-lg bg-ymau-dark-red/10 shrink-0">
                        <UsersRound className="h-5 w-5 text-ymau-dark-red" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900">{committee.name}</h3>
                        <p className="text-sm text-gray-500">
                          {memberCount} member{memberCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(committee);
                        }}
                        className="p-2 rounded-lg text-gray-400 hover:text-ymau-dark-red hover:bg-ymau-dark-red/10 transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm({
                            id: committee.id,
                            name: committee.name,
                            memberCount,
                          });
                        }}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {/* Committee metadata preview */}
                  {(committee.description || committee.chairperson || committee.languageLevel) && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                      {committee.description && (
                        <p className="text-xs text-gray-500 line-clamp-1">{committee.description}</p>
                      )}
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                        {committee.chairperson && (
                          <p className="text-xs text-gray-400">
                            <span className="font-medium">Chair:</span> {committee.chairperson}
                          </p>
                        )}
                        {committee.languageLevel && (
                          <p className="text-xs text-gray-400">
                            <span className="font-medium">Level:</span> {committee.languageLevel}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Committee Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setCreateFields(emptyFormFields);
        }}
        title="Add Committee"
        size="md"
      >
        <div className="space-y-4">
          {renderFormFields(createFields, setCreateFields, true)}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setCreateFields(emptyFormFields);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!createFields.name.trim() || creating}
              isLoading={creating}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Committee Modal */}
      <Modal
        isOpen={!!editCommittee}
        onClose={() => setEditCommittee(null)}
        title="Edit Committee"
        size="md"
      >
        <div className="space-y-4">
          {renderFormFields(editFields, setEditFields)}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditCommittee(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={!editFields.name.trim() || saving}
              isLoading={saving}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Committee"
        size="sm"
      >
        {deleteConfirm && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete <span className="font-semibold">{deleteConfirm.name}</span>?
              {deleteConfirm.memberCount > 0 && (
                <span className="block mt-2 text-amber-600">
                  {deleteConfirm.memberCount} student{deleteConfirm.memberCount !== 1 ? 's' : ''} will be unassigned from this committee.
                </span>
              )}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={deleting}
                isLoading={deleting}
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
