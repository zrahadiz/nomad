import { supabase } from "@/lib/supabase/client";

export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export async function getMyProfile(): Promise<Profile> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;

  if (!user) {
    throw new Error("You must be logged in to access your profile.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) throw error;

  return data as Profile;
}

export async function updateMyProfile(
  updates: Pick<Profile, "full_name" | "avatar_url">,
): Promise<Profile> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;

  if (!user) {
    throw new Error("You must be logged in to update your profile.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();

  if (error) throw error;

  return data as Profile;
}

export async function uploadAvatar(
  uri: string,
  mimeType?: string | null,
): Promise<string> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("You must be logged in to upload an avatar.");

  const response = await fetch(uri);

  if (!response.ok) {
    throw new Error("Unable to read the selected image.");
  }

  const arrayBuffer = await response.arrayBuffer();

  const contentType = mimeType || "image/jpeg";

  const extension =
    contentType === "image/png"
      ? "png"
      : contentType === "image/webp"
        ? "webp"
        : "jpg";

  const filePath = `${user.id}/avatar-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, arrayBuffer, {
      contentType,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

  return data.publicUrl;
}

export async function deleteAvatar(avatarUrl: string): Promise<void> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("You must be logged in to delete an avatar.");

  // Only delete images belonging to our public avatars bucket.
  // This prevents accidentally deleting external Google profile pictures.
  const url = new URL(avatarUrl);
  const bucketPrefix = "/storage/v1/object/public/avatars/";

  if (!url.pathname.includes(bucketPrefix)) {
    return;
  }

  const encodedPath = url.pathname.split(bucketPrefix)[1];

  if (!encodedPath) return;

  const filePath = decodeURIComponent(encodedPath);

  console.log("Original avatar URL:", avatarUrl);
  console.log("Decoded file path:", filePath);
  console.log("Current user ID:", user.id);

  // Users can only delete files inside their own folder.
  if (!filePath.startsWith(`${user.id}/`) || filePath.includes("..")) {
    return;
  }

  // const { data, error } = await supabase.storage.from("avatars").list(user.id);

  // console.log("Files in user folder:", data);
  // console.log("List error:", error);

  const { data, error } = await supabase.storage
    .from("avatars")
    .remove([filePath]);

  console.log("Deleted avatar:", data);
  console.log("Delete avatar error:", error);
  if (error) throw error;
}
