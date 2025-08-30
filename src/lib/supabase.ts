import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client with your project's URL and anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
});

// File upload function with progress tracking
export async function uploadFile(
  file: File,
  bucket: string = 'meetings',
  path?: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    console.log('Starting file upload to bucket:', bucket);
    console.log('File details:', {
      name: file.name,
      type: file.type,
      size: file.size,
      isFile: file instanceof File,
      isBlob: file instanceof Blob
    });

    const fileName = path || `${Date.now()}_${file.name}`;
    console.log('Uploading to path:', fileName);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', {
        message: error.message,
        name: error.name,
        // Log the full error object for debugging
        error: JSON.stringify(error, Object.getOwnPropertyNames(error))
      });
      throw error;
    }

    console.log('Upload successful, getting public URL for:', data.path);
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    console.log('Generated public URL:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('Error in uploadFile:', {
      error,
      bucket,
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

// Function to delete a file
export async function deleteFile(bucket: string, path: string): Promise<void> {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

// Function to get file URL
export function getFileUrl(bucket: string, path: string): string {
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  
  return publicUrl;
}
