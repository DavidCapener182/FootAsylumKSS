import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Store, Building2, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'
import { StoreDirectory } from '@/components/stores/store-directory'

async function getStores() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('fa_stores')
    .select('*')
    .order('store_name', { ascending: true })

  if (error) {
    console.error('Error fetching stores:', error)
    return []
  }

  return data || []
}

async function getStoreIncidents(storeId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('fa_incidents')
    .select('id, reference_no, summary, status, closed_at, occurred_at')
    .eq('store_id', storeId)
    .order('occurred_at', { ascending: false })

  if (error) {
    console.error('Error fetching store incidents:', error)
    return []
  }

  return data || []
}

async function getStoreActions(storeId: string) {
  const supabase = createClient()
  
  // First get all incidents for this store
  const { data: incidents } = await supabase
    .from('fa_incidents')
    .select('id')
    .eq('store_id', storeId)
  
  if (!incidents || incidents.length === 0) {
    return []
  }
  
  const incidentIds = incidents.map((inc: any) => inc.id)
  
  // Then get all actions for those incidents
  const { data, error } = await supabase
    .from('fa_actions')
    .select(`
      id,
      title,
      status,
      due_date,
      completed_at,
      incident_id,
      incident:fa_incidents!fa_actions_incident_id_fkey(reference_no)
    `)
    .in('incident_id', incidentIds)
    .order('due_date', { ascending: false })

  if (error) {
    console.error('Error fetching store actions:', error)
    return []
  }

  return data || []
}

export default async function StoresPage() {
  const { profile } = await requireRole(['admin', 'ops', 'readonly'])
  const stores = await getStores()
  
  // Fetch incidents and actions for all stores in parallel
  const storesWithData = await Promise.all(
    stores.map(async (store) => {
      const [incidents, actions] = await Promise.all([
        getStoreIncidents(store.id),
        getStoreActions(store.id),
      ])
      return { ...store, incidents, actions }
    })
  )

  // Calculate stats
  const totalStores = storesWithData.length
  const activeStores = storesWithData.filter((s: any) => s.is_active).length
  const inactiveStores = totalStores - activeStores

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8 bg-slate-50/50 min-h-screen">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 text-slate-900">
            <div className="p-2 bg-indigo-600 rounded-lg shadow-sm flex-shrink-0">
              <Store className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Stores</h1>
          </div>
          <p className="text-sm sm:text-base text-slate-500 max-w-2xl ml-9 sm:ml-11">
            Manage store locations, view compliance data, and track incidents by location.
          </p>
        </div>
        {profile.role === 'admin' && (
          <div className="flex-shrink-0">
            <Link href="/stores/new">
              <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all active:scale-95 min-h-[44px] w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Add New Store</span>
                <span className="sm:hidden">Add Store</span>
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 md:grid-cols-3 gap-3 md:gap-4">
        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="p-3 md:p-6 flex flex-col md:flex-row items-center md:items-center justify-between gap-2 md:gap-0">
            <div className="space-y-1 text-center md:text-left flex-1 min-w-0">
              <p className="text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Stores</p>
              <p className="text-xl md:text-2xl font-bold text-slate-900">{totalStores}</p>
            </div>
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-4 w-4 md:h-5 md:w-5 text-slate-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="p-3 md:p-6 flex flex-col md:flex-row items-center md:items-center justify-between gap-2 md:gap-0">
            <div className="space-y-1 text-center md:text-left flex-1 min-w-0">
              <p className="text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Locations</p>
              <p className="text-xl md:text-2xl font-bold text-green-600">{activeStores}</p>
            </div>
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="p-3 md:p-6 flex flex-col md:flex-row items-center md:items-center justify-between gap-2 md:gap-0">
            <div className="space-y-1 text-center md:text-left flex-1 min-w-0">
              <p className="text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">Inactive Locations</p>
              <p className="text-xl md:text-2xl font-bold text-slate-600">{inactiveStores}</p>
            </div>
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
              <XCircle className="h-4 w-4 md:h-5 md:w-5 text-slate-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Store Directory with Search */}
      <StoreDirectory stores={storesWithData} />
    </div>
  )
}

