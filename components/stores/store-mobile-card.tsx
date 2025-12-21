'use client'

import { StoreModalWrapper } from '@/components/stores/store-modal-wrapper'
import { Card } from '@/components/ui/card'
import { MapPin, Building2 } from 'lucide-react'

interface StoreMobileCardProps {
  store: any
}

export function StoreMobileCard({ store }: StoreMobileCardProps) {
  // Build address string for Google Maps
  const addressParts = [
    store.address_line_1,
    store.city,
    store.postcode,
  ].filter(Boolean)
  
  const fullAddress = addressParts.join(', ')
  
  // Google Maps embed URL (no API key required)
  const googleMapsEmbedUrl = fullAddress
    ? `https://www.google.com/maps?q=${encodeURIComponent(fullAddress)}&output=embed`
    : null

  return (
    <Card className="p-0 hover:shadow-md transition-shadow overflow-hidden">
      {/* Google Maps Embed */}
      {googleMapsEmbedUrl && (
        <div className="relative w-full h-48 bg-slate-100">
          <iframe
            src={googleMapsEmbedUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="w-full h-full"
          />
        </div>
      )}

      {/* Store Information */}
      <div className="p-4 space-y-3">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <StoreModalWrapper store={store} incidents={store.incidents} actions={store.actions}>
              <h3 className="font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer transition-colors text-lg leading-tight">
                {store.store_name}
              </h3>
            </StoreModalWrapper>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            {store.store_code && (
              <span className="font-mono text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {store.store_code}
              </span>
            )}
            {store.region && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {store.region}
              </span>
            )}
          </div>
        </div>

        {/* Location */}
        {fullAddress && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Location</p>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-slate-700 flex-1">{fullAddress}</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

