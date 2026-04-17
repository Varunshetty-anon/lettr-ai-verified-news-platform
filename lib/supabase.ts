import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

// We fallback silently for now so it doesn't crash builds if keys aren't added immediately
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

/**
 * Downloads an image from a URL and uploads it to the Supabase 'media' bucket.
 * Returns the public URL of the uploaded image.
 */
export async function uploadMediaFromUrl(url: string, filename: string): Promise<string | null> {
  if (!supabase) return null;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    const { data, error } = await supabase.storage
      .from('media')
      .upload(`bot-uploads/${Date.now()}-${filename}`, buffer, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('media')
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Failed to upload media from URL:', error);
    return null;
  }
}

