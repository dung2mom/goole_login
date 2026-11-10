import { createServerClient, type CookieOptions } from '@supabase/ssr';

export type CookieStoreLike = {
  getAll?: () => Array<{ name: string; value: string }> | Promise<Array<{ name: string; value: string }>>;
  setAll?: (cookies: Array<{ name: string; value: string; options?: CookieOptions }>) => void | Promise<void>;
  get?: (name: string) => { name: string; value: string } | undefined | Promise<{ name: string; value: string } | undefined>;
  set?: (name: string, value: string, options?: CookieOptions) => void | Promise<void>;
};

export async function createClient(cookieStore?: CookieStoreLike) {
  const supabaseUrl =
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
    'https://tdxhdgolwghcbsjeltsh.supabase.co';

  const supabaseKey =
    (typeof process !== 'undefined' &&
      (process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkeGhkZ29sd2doY2JzamVsdHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQxMzM2NzEsImV4cCI6MjEwOTcwOTY3MX0.1XpsBsZuyCalMkR9cjSASFCtbIvRjjGcfd0fIyXC9I4';

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      async getAll() {
        if (!cookieStore) return [];
        if (typeof cookieStore.getAll === 'function') {
          return await cookieStore.getAll();
        }
        return [];
      },
      async setAll(cookiesToSet) {
        try {
          if (cookieStore?.setAll) {
            await cookieStore.setAll(cookiesToSet);
          } else if (cookieStore?.set) {
            for (const { name, value, options } of cookiesToSet) {
              await cookieStore.set(name, value, options);
            }
          }
        } catch {
          // Can be ignored if called from a pure Server Component without write permissions
        }
      },
    },
  });
}

/**
 * Service role client for trusted server-side operations (bypasses RLS)
 */
export function createAdminClient() {
  const supabaseUrl =
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
    'https://tdxhdgolwghcbsjeltsh.supabase.co';

  const serviceRoleKey =
    (typeof process !== 'undefined' && process.env?.SUPABASE_SERVICE_ROLE_KEY) ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkeGhkZ29sd2doY2JzamVsdHNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDEzMzY3MSwiZXhwIjoyMTA5NzA5NjcxfQ.73fxhGVF-GsKQ1zSCHlyDJ48sCstux_iO0kh7ibCutU';

  return createServerClient(supabaseUrl, serviceRoleKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {},
    },
  });
}
