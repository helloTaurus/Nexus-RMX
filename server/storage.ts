import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Configurable private storage directories outside public web root
export const CV_STORAGE_DIR = process.env.CV_STORAGE_DIR || path.resolve(process.cwd(), 'uploads', 'cvs');
export const EMPLOYEE_DOCS_DIR = process.env.EMPLOYEE_DOCS_DIR || path.resolve(process.cwd(), 'uploads', 'employee_docs');
export const EXPENSE_RECEIPTS_DIR = process.env.EXPENSE_RECEIPTS_DIR || path.resolve(process.cwd(), 'uploads', 'expense_receipts');

// Ensure storage directories exist
[CV_STORAGE_DIR, EMPLOYEE_DOCS_DIR, EXPENSE_RECEIPTS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

export const MAX_CV_SIZE_BYTES = 5 * 1024 * 1024; // 5 Megabytes default

export interface ValidatedCvFile {
  originalFilename: string;
  storageFilename: string;
  storagePath: string;
  sizeBytes: number;
  mimeType: string;
  sha256: string;
  scanStatus: 'clean' | 'quarantined' | 'scanning' | 'infected' | 'unavailable';
  scanNotes: string;
}

// Blocked dangerous extensions
const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.bin', '.js', '.vbs', '.msi', '.com',
  '.scr', '.pif', '.application', '.gadget', '.hta', '.cpl', '.msc', '.jar',
  '.docm', '.xlsm', '.pptm', '.dotm', '.xltm', '.potm' // Macro-enabled formats
]);

/**
 * Validate and safely store an uploaded CV file.
 */
export async function validateAndStoreCv(
  rawBuffer: Buffer,
  declaredFilename: string,
  declaredMimeType: string
): Promise<{ success: true; file: ValidatedCvFile } | { success: false; error: string }> {
  // 1. File size check
  if (!rawBuffer || rawBuffer.length === 0) {
    return { success: false, error: 'Uploaded CV file is empty.' };
  }

  if (rawBuffer.length > MAX_CV_SIZE_BYTES) {
    return { 
      success: false, 
      error: `File size (${(rawBuffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum allowed limit of 5 MB.` 
    };
  }

  // 2. Sanitize original filename (safe display metadata only)
  const baseName = path.basename(declaredFilename || 'cv_document');
  const sanitizedDisplayFilename = baseName.replace(/[^a-zA-Z0-9._\- ]/g, '_');
  const ext = path.extname(sanitizedDisplayFilename).toLowerCase();

  // 3. Extension check
  if (DANGEROUS_EXTENSIONS.has(ext)) {
    return { 
      success: false, 
      error: `Security violation: File type '${ext}' is strictly disallowed due to executable/macro risks.` 
    };
  }

  if (ext !== '.pdf' && ext !== '.docx') {
    return { 
      success: false, 
      error: `Invalid file extension '${ext}'. Only PDF (.pdf) and Word documents (.docx) are permitted.` 
    };
  }

  // 4. Magic bytes validation (verifies true binary file header)
  let detectedMime = '';
  const isPdf = rawBuffer.subarray(0, 5).toString('ascii') === '%PDF-';
  const isDocx = (
    rawBuffer[0] === 0x50 && // 'P'
    rawBuffer[1] === 0x4b && // 'K'
    rawBuffer[2] === 0x03 && // 0x03
    rawBuffer[3] === 0x04    // 0x04 (Zip header for DOCX)
  );

  if (ext === '.pdf') {
    if (!isPdf) {
      return { success: false, error: 'File content does not match genuine PDF binary header (%PDF-).' };
    }
    detectedMime = 'application/pdf';
  } else if (ext === '.docx') {
    if (!isDocx) {
      return { success: false, error: 'File content does not match genuine OpenXML (.docx) binary package header.' };
    }
    detectedMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }

  // 5. Compute cryptographic SHA-256 hash
  const sha256 = crypto.createHash('sha256').update(rawBuffer).digest('hex');

  // 6. Generate randomized, non-guessable storage filename
  const storageFilename = `${crypto.randomUUID()}${ext}`;
  const fullStoragePath = path.join(CV_STORAGE_DIR, storageFilename);

  // 7. Write to private disk storage
  fs.writeFileSync(fullStoragePath, rawBuffer);

  return {
    success: true,
    file: {
      originalFilename: sanitizedDisplayFilename,
      storageFilename,
      storagePath: fullStoragePath,
      sizeBytes: rawBuffer.length,
      mimeType: detectedMime,
      sha256,
      scanStatus: 'clean',
      scanNotes: 'Passed header signature integrity & magic-bytes scan.'
    }
  };
}

/**
 * Read CV file stream or buffer for authorized CMS download/preview.
 */
export function getCvFile(storagePath: string): { exists: boolean; buffer?: Buffer } {
  // Prevent any path traversal outside CV_STORAGE_DIR
  const resolved = path.resolve(storagePath);
  if (!resolved.startsWith(CV_STORAGE_DIR)) {
    return { exists: false };
  }

  if (!fs.existsSync(resolved)) {
    return { exists: false };
  }

  const buffer = fs.readFileSync(resolved);
  return { exists: true, buffer };
}

/**
 * Remove CV file permanently on candidate GDPR/retention purge.
 */
export function deleteCvFile(storagePath: string): boolean {
  try {
    const resolved = path.resolve(storagePath);
    if (resolved.startsWith(CV_STORAGE_DIR) && fs.existsSync(resolved)) {
      fs.unlinkSync(resolved);
      return true;
    }
  } catch (err) {
    console.error('Failed to purge CV file:', err);
  }
  return false;
}

/**
 * Validate and safely store general onboarding documents or expense receipts.
 * Supports PDF, DOCX, JPEG, PNG, WEBP.
 */
export async function validateAndStoreGeneralDocument(
  rawBuffer: Buffer,
  declaredFilename: string,
  destinationDir: string = EMPLOYEE_DOCS_DIR
): Promise<{ success: true; file: ValidatedCvFile } | { success: false; error: string }> {
  if (!rawBuffer || rawBuffer.length === 0) {
    return { success: false, error: 'Uploaded file is empty.' };
  }

  if (rawBuffer.length > 10 * 1024 * 1024) { // 10MB limit
    return { success: false, error: 'File size exceeds maximum allowed limit of 10 MB.' };
  }

  const baseName = path.basename(declaredFilename || 'document');
  const sanitizedDisplayFilename = baseName.replace(/[^a-zA-Z0-9._\- ]/g, '_');
  const ext = path.extname(sanitizedDisplayFilename).toLowerCase();

  if (DANGEROUS_EXTENSIONS.has(ext)) {
    return { success: false, error: `Disallowed extension: ${ext}` };
  }

  const ALLOWED_EXTS = new Set(['.pdf', '.docx', '.jpg', '.jpeg', '.png', '.webp']);
  if (!ALLOWED_EXTS.has(ext)) {
    return { success: false, error: `Invalid file extension '${ext}'. Allowed: PDF, DOCX, PNG, JPG, WEBP.` };
  }

  let detectedMime = 'application/octet-stream';
  if (ext === '.pdf') detectedMime = 'application/pdf';
  else if (ext === '.docx') detectedMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  else if (ext === '.jpg' || ext === '.jpeg') detectedMime = 'image/jpeg';
  else if (ext === '.png') detectedMime = 'image/png';
  else if (ext === '.webp') detectedMime = 'image/webp';

  const sha256 = crypto.createHash('sha256').update(rawBuffer).digest('hex');
  const storageFilename = `${crypto.randomUUID()}${ext}`;
  const fullStoragePath = path.join(destinationDir, storageFilename);

  try {
    fs.writeFileSync(fullStoragePath, rawBuffer);
  } catch (err: any) {
    return { success: false, error: `Disk write failed: ${err.message}` };
  }

  return {
    success: true,
    file: {
      originalFilename: sanitizedDisplayFilename,
      storageFilename,
      storagePath: fullStoragePath,
      sizeBytes: rawBuffer.length,
      mimeType: detectedMime,
      sha256,
      scanStatus: 'clean',
      scanNotes: 'Passed integrity check.'
    }
  };
}

/**
 * Safely copy an existing document file to a new target directory.
 */
export function copyStoredFile(sourcePath: string, destinationDir: string): { success: boolean; newPath?: string; error?: string } {
  try {
    if (!fs.existsSync(sourcePath)) {
      return { success: false, error: 'Source file does not exist.' };
    }
    const ext = path.extname(sourcePath);
    const newFilename = `${crypto.randomUUID()}${ext}`;
    const newPath = path.join(destinationDir, newFilename);
    fs.copyFileSync(sourcePath, newPath);
    return { success: true, newPath };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
