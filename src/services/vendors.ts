import { supabase } from '@/lib/supabase'
import type { Vendor } from '@/types'

export async function fetchVendors(): Promise<Vendor[]> {
  const { data, error } = await supabase.from('vendors').select('*').order('name')
  if (error) {
    console.error('Error fetching vendors:', error)
    return []
  }
  return (data as Vendor[]) ?? []
}
