import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl =
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
    (typeof import.meta !== 'undefined' &&
      (import.meta.env?.NEXT_PUBLIC_SUPABASE_URL || import.meta.env?.VITE_SUPABASE_URL)) ||
    'https://tdxhdgolwghcbsjeltsh.supabase.co';

  const supabaseKey =
    (typeof process !== 'undefined' &&
      (process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) ||
    (typeof import.meta !== 'undefined' &&
      (import.meta.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        import.meta.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        import.meta.env?.VITE_SUPABASE_ANON_KEY ||
        import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY)) ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkeGhkZ29sd2doY2JzamVsdHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQxMzM2NzEsImV4cCI6MjEwOTcwOTY3MX0.1XpsBsZuyCalMkR9cjSASFCtbIvRjjGcfd0fIyXC9I4';

  return createBrowserClient(supabaseUrl, supabaseKey);
}
