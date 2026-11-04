import { supabase } from "@/lib/supabase/client";

export type Workspace = {
  id: string;
  user_id: string;
  name: string;
  country_code: string;
  currency_code: string;
  created_at: string;
  updated_at: string;
};

export type CreateWorkspaceInput = {
  name: string;
  country_code: string;
  currency_code: string;
};

export type UpdateWorkspaceInput = {
  name: string;
  country_code: string;
  currency_code: string;
};

// Get all workspaces belonging to the current user.
export async function getMyWorkspaces(): Promise<Workspace[]> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("You must be logged in to access workspaces.");

  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data as Workspace[];
}

// Create a workspace for the current user.
export async function createWorkspace(
  input: CreateWorkspaceInput,
): Promise<Workspace> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("You must be logged in to create a workspace.");

  const { data, error } = await supabase
    .from("workspaces")
    .insert({
      user_id: user.id,
      name: input.name.trim(),
      country_code: input.country_code.toUpperCase(),
      currency_code: input.currency_code.toUpperCase(),
    })
    .select()
    .single();

  if (error) throw error;

  return data as Workspace;
}

// Update an existing workspace.
export async function updateWorkspace(
  id: string,
  input: UpdateWorkspaceInput,
): Promise<Workspace> {
  const { data, error } = await supabase
    .from("workspaces")
    .update({
      name: input.name.trim(),
      country_code: input.country_code.toUpperCase(),
      currency_code: input.currency_code.toUpperCase(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data as Workspace;
}

// Delete an existing workspace.
export async function deleteWorkspace(id: string): Promise<void> {
  const { error } = await supabase.from("workspaces").delete().eq("id", id);

  if (error) throw error;
}
