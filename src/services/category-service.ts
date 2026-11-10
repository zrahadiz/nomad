import { supabase } from "@/lib/supabase/client";

import type { categoryType, financialCategory } from "@/types/finances";

type categoryRow = {
  id: string;
  user_id: string | null;
  name: string;
  type: categoryType;
  icon: string | null;
  color: string | null;
  is_default: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

function mapCategory(row: categoryRow): financialCategory {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    type: row.type,
    icon: row.icon,
    color: row.color,
    isDefault: row.is_default,
    isArchived: row.is_archived,
  };
}

// Fetch all active categories visible to the current user.
export async function getCategories(
  type?: categoryType,
): Promise<financialCategory[]> {
  let query = supabase
    .from("categories")
    .select("*")
    .eq("is_archived", false)
    .order("name", { ascending: true });

  if (type) {
    query = query.eq("type", type);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data as categoryRow[]).map(mapCategory);
}
