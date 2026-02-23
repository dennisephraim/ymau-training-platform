'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Progress } from '@/components/ui/Progress';
import { Modal } from '@/components/ui/Modal';
import {
  Plus,
  FileText,
  Trash2,
  Download,
  Upload,
  Users,
  File,
  Image,
  FileVideo,
  FileAudio,
  FileArchive,
  FileSpreadsheet,
  Presentation,
  FolderOpen,
  Calendar,
  X,
  Pencil,
  Filter,
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { Resource } from '@/types/resource';
import { Committee } from '@/types/committee';
import { UserRole } from '@/types/user';
import * as resourceService from '@/lib/services/resources';
import * as storageService from '@/lib/services/storage';
import * as committeeService from '@/lib/services/committees';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'student', label: 'Students' },
  { value: 'instructor', label: 'Instructors' },
  { value: 'admin', label: 'Admins' },
];

interface ResourceFormFields {
  title: string;
  description: string;
  committeeIds: string[];
  visibleToRoles: UserRole[];
}

const emptyFormFields: ResourceFormFields = {
  title: '',
  description: '',
  committeeIds: [],
  visibleToRoles: ['student'],
};

export default function InstructorResourcesPage() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [resources, setResources] = useState<Resource[]>([]);
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [filterCommitteeId, setFilterCommitteeId] = useState<string>('all');

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFields, setUploadFields] = useState<ResourceFormFields>(emptyFormFields);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Edit modal state
  const [editResource, setEditResource] = useState<Resource | null>(null);
  const [editFields, setEditFields] = useState<ResourceFormFields>(emptyFormFields);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [resourcesData, committeesData] = await Promise.all([
        resourceService.getAllResources(),
        committeeService.getAllCommittees(),
      ]);
      setResources(resourcesData);
      setCommittees(committeesData);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered resources
  const displayedResources =
    filterCommitteeId === 'all'
      ? resources
      : filterCommitteeId === 'none'
        ? resources.filter((r) => r.committeeIds.length === 0)
        : resources.filter((r) => r.committeeIds.includes(filterCommitteeId));

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return Image;
    if (fileType.startsWith('video/')) return FileVideo;
    if (fileType.startsWith('audio/')) return FileAudio;
    if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z')) return FileArchive;
    if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('csv')) return FileSpreadsheet;
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return Presentation;
    if (fileType.includes('pdf')) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 100 * 1024 * 1024) {
        setError('File must be less than 100MB');
        return;
      }
      setFile(selectedFile);
      if (!uploadFields.title) {
        setUploadFields((prev) => ({
          ...prev,
          title: selectedFile.name.replace(/\.[^/.]+$/, ''),
        }));
      }
      setError(null);
    }
  };

  const toggleRole = (
    roles: UserRole[],
    role: UserRole,
    setRoles: (roles: UserRole[]) => void,
    setErr: (msg: string | null) => void
  ) => {
    if (roles.includes(role)) {
      if (roles.length === 1) {
        setErr('At least one role must be selected');
        return;
      }
      setRoles(roles.filter((r) => r !== role));
    } else {
      setRoles([...roles, role]);
    }
    setErr(null);
  };

  const resetUploadForm = () => {
    setUploadFields(emptyFormFields);
    setFile(null);
    setError(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!user || !file) return;

    if (!uploadFields.title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const tempId = crypto.randomUUID();

      const fileUrl = await storageService.uploadResourceFile(
        tempId,
        file,
        (progress) => {
          setUploadProgress(progress.progress);
        }
      );

      await resourceService.createResource({
        title: uploadFields.title.trim(),
        description: uploadFields.description.trim(),
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        committeeIds: uploadFields.committeeIds,
        visibleToRoles: uploadFields.visibleToRoles,
        uploadedBy: user.id,
        uploadedByName: user.displayName,
      });

      await fetchData();
      setShowUploadModal(false);
      resetUploadForm();
    } catch (err) {
      console.error('Error uploading resource:', err);
      setError('Failed to upload resource. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const openEditModal = (resource: Resource) => {
    setEditResource(resource);
    setEditFields({
      title: resource.title,
      description: resource.description,
      committeeIds: [...resource.committeeIds],
      visibleToRoles: [...resource.visibleToRoles],
    });
    setEditError(null);
  };

  const handleEdit = async () => {
    if (!editResource) return;

    if (!editFields.title.trim()) {
      setEditError('Title is required');
      return;
    }

    try {
      setSaving(true);
      setEditError(null);

      await resourceService.updateResource(editResource.id, {
        title: editFields.title.trim(),
        description: editFields.description.trim(),
        committeeIds: editFields.committeeIds,
        visibleToRoles: editFields.visibleToRoles,
      });

      setEditResource(null);
      await fetchData();
    } catch (err) {
      console.error('Error updating resource:', err);
      setEditError('Failed to update resource. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickAssign = async (resourceId: string, committeeId: string) => {
    try {
      await resourceService.updateResource(resourceId, { committeeIds: [committeeId] });
      setResources((prev) =>
        prev.map((r) => (r.id === resourceId ? { ...r, committeeIds: [committeeId] } : r))
      );
    } catch (err) {
      console.error('Error assigning committee:', err);
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!confirm('Are you sure you want to delete this resource? This action cannot be undone.')) {
      return;
    }

    try {
      await resourceService.deleteResource(resourceId);
      setResources((prev) => prev.filter((r) => r.id !== resourceId));
    } catch (err) {
      console.error('Error deleting resource:', err);
      alert('Failed to delete resource');
    }
  };

  // Shared form fields for create and edit modals
  const renderFormFields = (
    fields: ResourceFormFields,
    setFields: (fields: ResourceFormFields) => void,
    fieldError: string | null,
    setFieldError: (err: string | null) => void,
    disabled: boolean
  ) => (
    <>
      {/* Title */}
      <Input
        label="Title"
        value={fields.title}
        onChange={(e) => setFields({ ...fields, title: e.target.value })}
        placeholder="Resource title"
        disabled={disabled}
      />

      {/* Description */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Description <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={fields.description}
          onChange={(e) => setFields({ ...fields, description: e.target.value })}
          placeholder="Brief description..."
          rows={2}
          disabled={disabled}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-ymau-dark-red focus:outline-none focus:ring-1 focus:ring-ymau-dark-red disabled:bg-gray-50"
        />
      </div>

      {/* Committees */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Committees <span className="text-gray-400 font-normal">(none = General)</span>
        </label>
        <div className="flex gap-2 flex-wrap">
          {committees.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                const ids = fields.committeeIds.includes(c.id)
                  ? fields.committeeIds.filter((id) => id !== c.id)
                  : [...fields.committeeIds, c.id];
                setFields({ ...fields, committeeIds: ids });
              }}
              disabled={disabled}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                fields.committeeIds.includes(c.id)
                  ? 'bg-ymau-dark-red text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Visible to Roles */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Users className="h-4 w-4" />
          Visible to Roles
        </label>
        <div className="flex gap-2 flex-wrap">
          {ROLES.map((role) => (
            <button
              key={role.value}
              onClick={() =>
                toggleRole(
                  fields.visibleToRoles,
                  role.value,
                  (roles) => setFields({ ...fields, visibleToRoles: roles }),
                  setFieldError
                )
              }
              disabled={disabled}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                fields.visibleToRoles.includes(role.value)
                  ? 'bg-ymau-dark-red text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {role.label}
            </button>
          ))}
        </div>
        {fieldError && (
          <p className="text-red-600 text-xs">{fieldError}</p>
        )}
      </div>
    </>
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded-lg w-48 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-72 animate-pulse"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded-lg w-36 animate-pulse"></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resources</h1>
          <p className="text-gray-500 mt-1">
            Upload and manage downloadable files for delegates
          </p>
        </div>
        <Button onClick={() => setShowUploadModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Upload Resource
        </Button>
      </div>

      {/* Committee Filter */}
      {resources.length > 0 && (
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={filterCommitteeId}
            onChange={(e) => setFilterCommitteeId(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-ymau-dark-red focus:outline-none focus:ring-1 focus:ring-ymau-dark-red"
          >
            <option value="all">All committees</option>
            <option value="none">No committee (General)</option>
            {committees.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {filterCommitteeId !== 'all' && (
            <button
              onClick={() => setFilterCommitteeId('all')}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              Clear filter
            </button>
          )}
        </div>
      )}

      {/* Resources Grid */}
      {displayedResources.length === 0 ? (
        <Card className="border-dashed border-2 border-ymau-dark-red/30 bg-ymau-dark-red/5">
          <CardContent className="py-12">
            <EmptyState
              icon={<FolderOpen className="h-8 w-8" />}
              title={filterCommitteeId !== 'all' ? 'No Resources Found' : 'No Resources Yet'}
              description={
                filterCommitteeId !== 'all'
                  ? 'No resources match the selected filter.'
                  : 'Upload your first resource to make it available for download.'
              }
              action={
                filterCommitteeId === 'all' ? (
                  <Button onClick={() => setShowUploadModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Resource
                  </Button>
                ) : undefined
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayedResources.map((resource) => {
            const FileIcon = getFileIcon(resource.fileType);

            return (
              <div
                key={resource.id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:border-ymau-dark-red/30 transition-colors group"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-ymau-dark-red/10 shrink-0">
                    <FileIcon className="h-6 w-6 text-ymau-dark-red" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {resource.title}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                      {resource.description || resource.fileName}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <File className="h-3 w-3" />
                    {formatFileSize(resource.fileSize)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(resource.createdAt)}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {resource.committeeIds.length === 0 ? (
                    <Badge variant="default" size="sm">General</Badge>
                  ) : (
                    resource.committeeIds.map((cId) => (
                      <Badge key={cId} variant="info" size="sm">
                        {committees.find((c) => c.id === cId)?.name || 'Unknown'}
                      </Badge>
                    ))
                  )}
                  {resource.visibleToRoles.map((role) => (
                    <Badge key={role} variant="primary" size="sm">
                      {role}
                    </Badge>
                  ))}
                </div>

                {/* Quick-assign for untagged resources */}
                {filterCommitteeId === 'none' && resource.committeeIds.length === 0 && committees.length > 0 && (
                  <div className="mt-3">
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleQuickAssign(resource.id, e.target.value);
                        }
                      }}
                      className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-600 focus:border-ymau-dark-red focus:outline-none focus:ring-1 focus:ring-ymau-dark-red"
                    >
                      <option value="" disabled>
                        Assign to committee...
                      </option>
                      {committees.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <a
                    href={resource.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={resource.fileName}
                  >
                    <Button size="sm" variant="ghost">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </a>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditModal(resource)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteResource(resource.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => {
          if (!uploading) {
            setShowUploadModal(false);
            resetUploadForm();
          }
        }}
        title="Upload Resource"
      >
        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* File Selection */}
          {file ? (
            <div className="p-4 bg-ymau-dark-red/5 border border-ymau-dark-red/20 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-ymau-dark-red" />
                <div>
                  <p className="text-sm font-medium text-gray-700">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                disabled={uploading}
                className="p-1 rounded hover:bg-gray-200 text-gray-500 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-ymau-dark-red/50 cursor-pointer transition-colors"
            >
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Click to select a file</p>
              <p className="text-xs text-gray-500 mt-1">Max file size: 100MB</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />

          {renderFormFields(
            uploadFields,
            setUploadFields,
            error,
            setError,
            uploading
          )}

          {/* Upload Progress */}
          {uploading && uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Uploading...</span>
                <span className="text-gray-900 font-medium">{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} size="sm" />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setShowUploadModal(false);
                resetUploadForm();
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || !uploadFields.title.trim() || uploading}
              isLoading={uploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Resource Modal */}
      <Modal
        isOpen={!!editResource}
        onClose={() => setEditResource(null)}
        title="Edit Resource"
      >
        <div className="space-y-4">
          {editError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {editError}
            </div>
          )}

          {renderFormFields(
            editFields,
            setEditFields,
            editError,
            setEditError,
            saving
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setEditResource(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={!editFields.title.trim() || saving}
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
