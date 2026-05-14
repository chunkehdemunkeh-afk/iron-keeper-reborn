import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { awardXpAndNotify } from "@/lib/gamification/notify";

export interface ProgressPhoto {
  id: string;
  date: string;
  storagePath: string;
  pose: string | null;
  notes: string | null;
  createdAt: string;
  signedUrl: string | null;
}

const PHOTO_BUCKET = "progress-photos";
const SIGNED_URL_TTL = 60 * 5;

async function signPhotoUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
  return data?.signedUrl ?? null;
}

export async function fetchProgressPhotos(): Promise<ProgressPhoto[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("progress_photos")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const signed = await Promise.all(
    data.map(async (r: any) => ({
      id: r.id,
      date: r.date,
      storagePath: r.storage_path,
      pose: r.pose,
      notes: r.notes,
      createdAt: r.created_at,
      signedUrl: await signPhotoUrl(r.storage_path),
    }))
  );
  return signed;
}

export async function uploadProgressPhoto(
  file: File,
  date: string,
  pose?: string | null,
  notes?: string | null,
): Promise<ProgressPhoto | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = ["jpg", "jpeg", "png", "webp", "heic"].includes(ext) ? ext : "jpg";
  const storagePath = `${user.id}/${date}-${Date.now()}.${safeExt}`;

  const { error: uploadError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || `image/${safeExt}`,
      upsert: false,
    });

  if (uploadError) {
    console.error("Failed to upload photo:", uploadError);
    toast.error("Failed to upload photo");
    return null;
  }

  const { data: row, error: insertError } = await supabase
    .from("progress_photos")
    .insert({
      user_id: user.id,
      date,
      storage_path: storagePath,
      pose: pose || null,
      notes: notes || null,
    })
    .select("*")
    .single();

  if (insertError || !row) {
    console.error("Failed to save photo metadata:", insertError);
    await supabase.storage.from(PHOTO_BUCKET).remove([storagePath]);
    return null;
  }

  void awardXpAndNotify({ source: "progress_photo", metadata: { date } });

  return {
    id: row.id,
    date: row.date,
    storagePath: row.storage_path,
    pose: row.pose,
    notes: row.notes,
    createdAt: row.created_at,
    signedUrl: await signPhotoUrl(row.storage_path),
  };
}

export async function deleteProgressPhoto(id: string, storagePath: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  await supabase.storage.from(PHOTO_BUCKET).remove([storagePath]);

  const { error } = await supabase
    .from("progress_photos")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  return !error;
}

export async function updateProgressPhotoNotes(id: string, notes: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase
    .from("progress_photos")
    .update({ notes: notes || null })
    .eq("id", id)
    .eq("user_id", user.id);
  return !error;
}
