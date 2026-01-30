'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface StoreMapProps {
  storeName: string
  address: string
  latitude: number | null
  longitude: number | null
}

// Component to fit map bounds to store location
function MapFitBounds({ latitude, longitude }: { latitude: number | null, longitude: number | null }) {
  const map = useMap()

  useEffect(() => {
    if (latitude && longitude) {
      map.setView([latitude, longitude], 15)
    }
  }, [latitude, longitude, map])

  return null
}

export default function StoreMap({ storeName, address, latitude, longitude }: StoreMapProps) {
  // Default center (UK) if no coordinates
  const defaultCenter: [number, number] = [54.5, -2.0]
  const defaultZoom = 6

  // Create store marker icon
  const storeIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  })

  if (typeof window === 'undefined') {
    return (
      <div className="w-full h-64 bg-slate-100 flex items-center justify-center text-slate-500 rounded border border-slate-300">
        Loading map...
      </div>
    )
  }

  // If no coordinates, show message
  if (!latitude || !longitude) {
    return (
      <div className="w-full h-64 bg-slate-100 flex items-center justify-center text-slate-500 rounded border border-slate-300">
        <div className="text-center">
          <p className="font-medium mb-2">Map unavailable</p>
          <p className="text-sm">Store coordinates not available</p>
        </div>
      </div>
    )
  }

  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={15}
      className="fra-map-container"
      style={{ height: '400px', width: '100%', borderRadius: '0.5rem' }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapFitBounds latitude={latitude} longitude={longitude} />

      <Marker
        position={[latitude, longitude]}
        icon={storeIcon}
      >
        <Popup>
          <div className="font-semibold">{storeName}</div>
          <div className="text-sm text-slate-600">{address}</div>
        </Popup>
      </Marker>
    </MapContainer>
  )
}
