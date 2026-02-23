'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import {
  FileText,
  Download,
  Search,
  File,
  Image,
  FileVideo,
  FileAudio,
  FileArchive,
  FileSpreadsheet,
  Presentation,
  FolderOpen,
  Folder,
  Calendar,
  User,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { Resource, ResourceFolder } from '@/types/resource';
import * as resourceService from '@/lib/services/resources';

export default function ResourcesPage() {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [folders, setFolders] = useState<ResourceFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [resourcesData, foldersData] = await Promise.all([
        resourceService.getResourcesByRole(user.role),
        resourceService.getFoldersByRole(user.role),
      ]);
      setResources(resourcesData);
      setFolders(foldersData);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currentFolder = folders.find((f) => f.id === currentFolderId) || null;
  const isSearching = searchQuery.length > 0;

  // When searching, flatten across all folders
  const filteredResources = isSearching
    ? resources.filter(
        (resource) =>
          resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          resource.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          resource.fileName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : resources.filter((r) =>
        currentFolderId ? r.folderId === currentFolderId : !r.folderId
      );

  const getFolderResourceCount = (folderId: string) =>
    resources.filter((r) => r.folderId === folderId).length;

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

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded-lg w-48 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-72 animate-pulse"></div>
        </div>
        <div className="h-10 bg-gray-200 rounded-lg w-full max-w-md animate-pulse"></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        {currentFolder && !isSearching ? (
          <>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <button
                onClick={() => setCurrentFolderId(null)}
                className="hover:text-ymau-dark-red transition-colors"
              >
                Resources
              </button>
              <ChevronRight className="h-4 w-4" />
              <span className="text-gray-900 font-medium">{currentFolder.name}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{currentFolder.name}</h1>
            {currentFolder.description && (
              <p className="text-gray-500 mt-1">{currentFolder.description}</p>
            )}
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900">Resources</h1>
            <p className="text-gray-500 mt-1">
              {resources.length > 0
                ? `${resources.length} resource${resources.length !== 1 ? 's' : ''} available for download`
                : 'Downloadable files and materials'
              }
            </p>
          </>
        )}
      </div>

      {/* Search */}
      {resources.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value) setCurrentFolderId(null);
            }}
            className="pl-10"
          />
        </div>
      )}

      {/* Folder Cards (only at root, not when searching) */}
      {!currentFolderId && !isSearching && folders.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {folders.map((folder) => {
            const count = getFolderResourceCount(folder.id);
            return (
              <div
                key={folder.id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:border-ymau-dark-red/30 hover:shadow-lg hover:shadow-ymau-dark-red/10 transition-all duration-300 cursor-pointer"
                onClick={() => setCurrentFolderId(folder.id)}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-amber-100 shrink-0">
                    <Folder className="h-6 w-6 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {folder.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {count} resource{count !== 1 ? 's' : ''}
                    </p>
                    {folder.description && (
                      <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                        {folder.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resources Grid */}
      {resources.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-300 bg-gray-50">
          <CardContent className="py-12">
            <EmptyState
              icon={<FolderOpen className="h-8 w-8" />}
              title="No Resources Available"
              description="There are no resources available for your role at the moment. Check back later."
            />
          </CardContent>
        </Card>
      ) : filteredResources.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-300 bg-gray-50">
          <CardContent className="py-12">
            <EmptyState
              icon={isSearching ? <Search className="h-8 w-8" /> : <FolderOpen className="h-8 w-8" />}
              title={isSearching ? 'No Results Found' : 'No Resources in Folder'}
              description={
                isSearching
                  ? `No resources match "${searchQuery}". Try a different search term.`
                  : 'This folder is empty.'
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {!currentFolderId && !isSearching && folders.length > 0 && (
            <h2 className="text-lg font-semibold text-gray-900">Ungrouped Resources</h2>
          )}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredResources.map((resource) => {
              const FileIcon = getFileIcon(resource.fileType);

              return (
                <div
                  key={resource.id}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:border-ymau-dark-red/30 hover:shadow-lg hover:shadow-ymau-dark-red/10 transition-all duration-300"
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

                  <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <File className="h-3 w-3" />
                      {formatFileSize(resource.fileSize)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(resource.createdAt)}
                    </span>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {resource.uploadedByName}
                    </span>
                    <a
                      href={resource.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={resource.fileName}
                    >
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
