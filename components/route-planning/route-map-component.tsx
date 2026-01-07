'use client'

import { useEffect, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface Store {
  id: string
  store_name: string
  store_code: string | null
  latitude: number | null
  longitude: number | null
}

interface ManagerHome {
  latitude: number
  longitude: number
  address: string
}

interface RouteMapComponentProps {
  stores: Store[]
  managerHome: ManagerHome | null
}

// Create custom home icon using SVG
const homeIconSvg = `
  <div style="background: white; border-radius: 50%; padding: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.5523 5.44772 21 6 21H9M19 10L21 12M19 10V20C19 20.5523 18.5523 21 18 21H15M9 21C9.55228 21 10 20.5523 10 20V16C10 15.4477 10.4477 15 11 15H13C13.5523 15 14 15.4477 14 16V20C14 20.5523 14.4477 21 15 21M9 21H15" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="#dcfce7"/>
    </svg>
  </div>
`

const homeIcon = L.divIcon({
  className: 'custom-home-icon',
  html: homeIconSvg,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
})

// Component to fit map bounds
function MapBounds({ stores, managerHome }: { stores: Store[], managerHome: ManagerHome | null }) {
  const map = useMap()

  useEffect(() => {
    const locations: [number, number][] = []
    
    stores.forEach(store => {
      if (store.latitude && store.longitude) {
        locations.push([store.latitude, store.longitude])
      }
    })
    
    if (managerHome) {
      locations.push([managerHome.latitude, managerHome.longitude])
    }

    if (locations.length > 0) {
      const bounds = L.latLngBounds(locations)
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [stores, managerHome, map])

  return null
}

export default function RouteMapComponent({ stores, managerHome }: RouteMapComponentProps) {
  const mapRef = useRef<L.Map | null>(null)

  // Filter stores with coordinates
  const storesWithCoords = stores.filter(s => s.latitude && s.longitude)

  // Default center (UK)
  const defaultCenter: [number, number] = [54.5, -2.0]
  const defaultZoom = 6

  // Create route polyline coordinates (home -> stores -> home)
  const routeCoordinates = useMemo(() => {
    const coords: [number, number][] = []
    
    if (managerHome) {
      coords.push([managerHome.latitude, managerHome.longitude])
    }
    
    storesWithCoords.forEach(store => {
      if (store.latitude && store.longitude) {
        coords.push([store.latitude, store.longitude])
      }
    })
    
    if (managerHome && coords.length > 1) {
      // Return to home
      coords.push([managerHome.latitude, managerHome.longitude])
    }
    
    return coords
  }, [storesWithCoords, managerHome])

  if (typeof window === 'undefined') {
    return (
      <div className="w-full h-[400px] bg-slate-100 flex items-center justify-center text-slate-500 rounded-lg">
        Loading map...
      </div>
    )
  }

  if (storesWithCoords.length === 0 && !managerHome) {
    return (
      <div className="w-full h-[400px] bg-slate-100 flex items-center justify-center text-slate-500 rounded-lg">
        <div className="text-center">
          <p className="font-medium mb-2">No locations to display</p>
          <p className="text-sm">Stores need coordinates to show on the map.</p>
        </div>
      </div>
    )
  }

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      style={{ height: '400px', width: '100%', borderRadius: '0.5rem' }}
      ref={mapRef}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapBounds stores={storesWithCoords} managerHome={managerHome} />

      {/* Route polyline */}
      {routeCoordinates.length > 1 && (
        <Polyline
          positions={routeCoordinates}
          color="#3b82f6"
          weight={4}
          opacity={0.7}
        />
      )}

      {/* Manager Home Marker */}
      {managerHome && managerHome.latitude && managerHome.longitude && (
        <Marker
          position={[Number(managerHome.latitude), Number(managerHome.longitude)]}
          icon={homeIcon}
        >
          <Popup>
            <div className="font-semibold">Manager Home</div>
            <div className="text-sm text-slate-600">{managerHome.address}</div>
          </Popup>
        </Marker>
      )}

      {/* Store Markers */}
      {storesWithCoords.map((store, index) => {
        const storeIcon = L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        })
        
        return (
          <Marker
            key={store.id}
            position={[store.latitude!, store.longitude!]}
            icon={storeIcon}
          >
            <Popup>
              <div className="font-semibold">{store.store_name}</div>
              {store.store_code && (
                <div className="text-sm text-slate-600">Code: {store.store_code}</div>
              )}
              <div className="text-xs text-blue-600 mt-1">Stop {index + 1}</div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
