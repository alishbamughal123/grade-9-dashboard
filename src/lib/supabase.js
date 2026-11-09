import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const configured = Boolean(url && key && !url.includes('YOUR-PROJECT'))
export const supabase = configured ? createClient(url, key) : null

// Supabase returns max 1000 rows per request, so page through everything.
export async function fetchAll(table, select = '*') {
  const size = 1000
  let from = 0
  const out = []
  for (;;) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + size - 1)
    if (error) throw error
    out.push(...data)
    if (data.length < size) break
    from += size
  }
  return out
}
