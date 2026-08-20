export type StoreDirectoryIncident = {
  id: string
  reference_no: string
  summary: string
  status: string
  closed_at: string | null
  occurred_at: string
  store_id: string
}

export type StoreDirectoryAction = {
  id: string
  title: string
  status: string
  due_date: string
  priority?: string | null
  source_type: 'store' | 'incident'
  [key: string]: unknown
}

export type StoreDirectoryRow = {
  id: string
  store_name: string
  store_code: string | null
  is_active: boolean
  region: string | null
  city: string | null
  address_line_1: string | null
  postcode: string | null
  incidents: StoreDirectoryIncident[]
  actions: StoreDirectoryAction[]
  [key: string]: unknown
}

export type StoreDirectoryResult = {
  stores: StoreDirectoryRow[]
  totalStores: number
  activeStores: number
  inactiveStores: number
  activeRate: number
}
