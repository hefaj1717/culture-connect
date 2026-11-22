// @ts-nocheck -- Supabase Edge Functions run in Deno, outside the app tsconfig.
import { createClient } from 'npm:@supabase/supabase-js@2.110.0';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
};

type StorageEntry = {
  id?: string | null;
  name: string;
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

async function listOwnedFiles(
  admin: ReturnType<typeof createClient>,
  bucketId: string,
  prefix: string,
): Promise<string[]> {
  const files: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await admin.storage.from(bucketId).list(prefix, {
      limit: 100,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) throw error;

    const entries = (data ?? []) as StorageEntry[];
    for (const entry of entries) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id) {
        files.push(path);
      } else {
        files.push(...(await listOwnedFiles(admin, bucketId, path)));
      }
    }

    if (entries.length < 100) break;
    offset += entries.length;
  }

  return files;
}

async function removeOwnedStorage(admin: ReturnType<typeof createClient>, userId: string) {
  const { data: buckets, error: bucketsError } = await admin.storage.listBuckets();
  if (bucketsError) throw bucketsError;

  for (const bucket of buckets ?? []) {
    const paths = await listOwnedFiles(admin, bucket.id, userId);
    for (let index = 0; index < paths.length; index += 100) {
      const { error } = await admin.storage.from(bucket.id).remove(paths.slice(index, index + 100));
      if (error) throw error;
    }
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return json({ error: 'not_authenticated' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: 'server_not_configured' }, 500);
  }

  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error: userError } = await caller.auth.getUser();
  if (userError || !data.user) return json({ error: 'not_authenticated' }, 401);

  try {
    // Admin-created quests remain as public city content after the account is
    // removed, so clear image references before deleting the user's Storage
    // folder. Organizer events/rewards are removed by their Auth FK cascades.
    const { error: questImageError } = await admin
      .from('quests')
      .update({ image_url: null })
      .eq('created_by', data.user.id);
    if (questImageError) throw questImageError;

    await removeOwnedStorage(admin, data.user.id);

    const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id, false);
    if (deleteError) throw deleteError;

    return json({ success: true });
  } catch (error) {
    console.error('Account deletion failed', error);
    return json({ error: 'account_deletion_failed' }, 500);
  }
});
