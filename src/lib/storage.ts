import { supabase } from "@/lib/supabase";

export async function signSongFilePath(
  filePath: string,
  expiresIn = 8 * 60 * 60 // 8 hours - enough for long rehearsals/performances
): Promise<string> {
  const { data, error } = await supabase.storage
    .from("song-files")
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    throw new Error(error.message || `Failed to sign URL for ${filePath}`);
  }

  if (!data?.signedUrl) {
    throw new Error(`No signed URL returned for ${filePath}`);
  }

  return data.signedUrl;
}
