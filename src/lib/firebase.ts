import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client with your project's URL and anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
});

// For backward compatibility
export const storage = {
  ref: (path: string) => ({
    put: async (file: File) => {
      const { data, error } = await supabase.storage
        .from('default')
        .upload(path, file);
      if (error) throw error;
      return { ref: { fullPath: data.path } };
    }
  })
};

export async function uploadFile(
  file: File,
  setProgress?: (progress: number) => void
): Promise<string> {
  try {
    const fileName = `${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage
      .from('default')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('default')
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}