import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';

interface FileToDownload {
  url: string;
  fileName: string;
  studentName: string;
}

interface RequestBody {
  files: FileToDownload[];
  zipFileName: string;
}

/**
 * Sanitize a filename by removing special characters
 */
function sanitizeFileName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .trim();
}

/**
 * Create a unique filename by adding a suffix if needed
 */
function getUniqueFileName(existingNames: Set<string>, baseName: string): string {
  if (!existingNames.has(baseName)) {
    existingNames.add(baseName);
    return baseName;
  }

  const extIndex = baseName.lastIndexOf('.');
  const name = extIndex > 0 ? baseName.substring(0, extIndex) : baseName;
  const ext = extIndex > 0 ? baseName.substring(extIndex) : '';

  let counter = 1;
  let newName = `${name}_${counter}${ext}`;
  while (existingNames.has(newName)) {
    counter++;
    newName = `${name}_${counter}${ext}`;
  }

  existingNames.add(newName);
  return newName;
}

/**
 * POST /api/bulk-download
 *
 * Server-side ZIP creation to bypass CORS restrictions.
 * The server fetches files using signed download URLs and creates a ZIP.
 */
export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { files, zipFileName } = body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    const zip = new JSZip();
    const failedFiles: string[] = [];
    const existingNames = new Set<string>();

    // Download files in parallel (server-side, no CORS restrictions)
    const results = await Promise.allSettled(
      files.map(async (file) => {
        const response = await fetch(file.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }
        const buffer = await response.arrayBuffer();
        return { file, buffer };
      })
    );

    // Process results and add to ZIP
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { file, buffer } = result.value;
        const sanitizedStudentName = sanitizeFileName(file.studentName);
        const sanitizedFileName = sanitizeFileName(file.fileName);
        const baseName = `${sanitizedStudentName}_${sanitizedFileName}`;
        const uniqueName = getUniqueFileName(existingNames, baseName);
        zip.file(uniqueName, buffer);
      } else {
        // Extract file info from the failed promise if possible
        failedFiles.push('Unknown file');
      }
    }

    // Track which files failed by index
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const file = files[index];
        failedFiles[failedFiles.length - 1] = `${file.studentName}: ${file.fileName}`;
      }
    });

    // Check if any files were added
    if (Object.keys(zip.files).length === 0) {
      return NextResponse.json(
        { error: 'No files could be downloaded', failedFiles },
        { status: 500 }
      );
    }

    // Generate ZIP as ArrayBuffer (compatible with NextResponse)
    const zipArrayBuffer = await zip.generateAsync({ type: 'arraybuffer' });

    // Return the ZIP file
    return new NextResponse(zipArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${sanitizeFileName(zipFileName)}.zip"`,
        'X-Failed-Files': JSON.stringify(failedFiles),
      },
    });
  } catch (error) {
    console.error('Bulk download error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
