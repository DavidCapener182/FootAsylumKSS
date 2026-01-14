'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { StoreModalWrapper } from '@/components/stores/store-modal-wrapper'
import { StoreMobileCard } from '@/components/stores/store-mobile-card'
import { Search, Store, MapPin } from 'lucide-react'

interface StoreDirectoryProps {
  stores: any[]
}

export function StoreDirectory({ stores }: StoreDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  
  // Debug: Log when stores change
  useEffect(() => {
    console.log('StoreDirectory: stores count', stores?.length)
  }, [stores])

  const filteredStores = useMemo(() => {
    if (!stores || stores.length === 0) {
      return []
    }
    
    if (!searchQuery.trim()) {
      return stores
    }

    const query = searchQuery.toLowerCase().trim()
    const filtered = stores.filter((store) => {
      const storeName = String(store.store_name || '').toLowerCase()
      const storeCode = String(store.store_code || '').toLowerCase()
      const city = String(store.city || '').toLowerCase()
      const region = String(store.region || '').toLowerCase()
      const address = String(store.address_line_1 || '').toLowerCase()
      const postcode = String(store.postcode || '').toLowerCase()

      return (
        storeName.includes(query) ||
        storeCode.includes(query) ||
        city.includes(query) ||
        region.includes(query) ||
        address.includes(query) ||
        postcode.includes(query)
      )
    })
    
    console.log('Filtering:', { query, total: stores.length, filtered: filtered.length })
    return filtered
  }, [stores, searchQuery])

  return (
    <Card className="shadow-sm border-slate-200 bg-white overflow-hidden">
      <CardHeader className="border-b bg-slate-50/40 px-4 md:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-base font-semibold text-slate-800">
            Store Directory
            {searchQuery && (
              <span className="ml-2 text-sm font-normal text-slate-500">
                ({filteredStores.length} {filteredStores.length === 1 ? 'store' : 'stores'})
              </span>
            )}
          </CardTitle>
          
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" />
            <Input
              type="text"
              placeholder="Search stores..."
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value
                console.log('Search input changed:', value)
                setSearchQuery(value)
              }}
              className="h-9 w-full pl-9 pr-4 bg-white border-slate-200 text-sm focus-visible:ring-2 focus-visible:ring-indigo-500"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Mobile Card View */}
        <div className="md:hidden p-4 space-y-4">
          {filteredStores.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-slate-500 py-12">
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <Store className="h-5 w-5 text-slate-400" />
              </div>
              <p className="font-medium text-slate-900">
                {searchQuery ? 'No stores found' : 'No stores found'}
              </p>
              <p className="text-sm mt-1 text-center">
                {searchQuery 
                  ? 'Try adjusting your search terms.' 
                  : 'Add a new store to get started.'}
              </p>
            </div>
          ) : (
            filteredStores.map((store) => (
              <StoreMobileCard key={store.id} store={store} />
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[120px] font-semibold text-slate-500">Store Code</TableHead>
                <TableHead className="font-semibold text-slate-500">Store Name</TableHead>
                <TableHead className="font-semibold text-slate-500">Location</TableHead>
                <TableHead className="font-semibold text-slate-500">Region</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                        <Store className="h-5 w-5 text-slate-400" />
                      </div>
                      <p className="font-medium text-slate-900">
                        {searchQuery ? 'No stores found' : 'No stores found'}
                      </p>
                      <p className="text-sm mt-1">
                        {searchQuery 
                          ? 'Try adjusting your search terms.' 
                          : 'Add a new store to get started.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStores.map((store) => (
                  <TableRow key={store.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      {store.store_code ? (
                        <span className="font-mono text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
                          {store.store_code}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StoreModalWrapper store={store} incidents={store.incidents} actions={store.actions}>
                        <span className="font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer transition-colors">
                          {store.store_name}
                        </span>
                      </StoreModalWrapper>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <span className="text-sm text-slate-600">
                          {store.address_line_1 || store.city || store.postcode ? (
                            <span>
                              {store.address_line_1 && <span>{store.address_line_1}</span>}
                              {store.address_line_1 && store.city && <span>, </span>}
                              {store.city && <span>{store.city}</span>}
                              {store.postcode && (store.address_line_1 || store.city) && <span> </span>}
                              {store.postcode && <span className="text-slate-500">{store.postcode}</span>}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">No address</span>
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">{store.region || <span className="text-slate-400 italic">—</span>}</span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

