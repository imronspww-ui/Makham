'use client'
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// ── Icons (ใช้ CDN เพื่อหลีกเลี่ยง webpack asset issue) ─────────────────────
const userIcon = L.icon({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize:   [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
})

const storeIcon = L.divIcon({
  className: '',
  html: '<div style="width:20px;height:20px;background:#f97316;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.45)"></div>',
  iconSize:   [20, 20],
  iconAnchor: [10, 10],
})

// ── Sub-components ────────────────────────────────────────────────────────────

/** แตะบนแผนที่เพื่อวางหมุด */
function ClickHandler({ onPlace }: { onPlace: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPlace(e.latlng.lat, e.latlng.lng) })
  return null
}

/** บิน (pan+zoom) ไปยังตำแหน่งใหม่เมื่อ prop เปลี่ยน */
function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom() < 14 ? 15 : map.getZoom(), { duration: 0.8 })
  }, [lat, lng, map])
  return null
}

// ── Main export ───────────────────────────────────────────────────────────────

export interface MapPickerProps {
  pinLat:   number
  pinLng:   number
  storeLat: number
  storeLng: number
  flyOnChange?: boolean   // true = บินไปยังตำแหน่งใหม่เมื่อ pinLat/Lng เปลี่ยนจากภายนอก
  onSelect: (lat: number, lng: number) => void
}

export function MapPickerLeaflet({
  pinLat, pinLng, storeLat, storeLng, flyOnChange = false, onSelect,
}: MapPickerProps) {
  // internal state สำหรับ marker — sync จาก external props
  const [pos, setPos]           = useState<[number, number]>([pinLat, pinLng])
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    setPos([pinLat, pinLng])
    if (flyOnChange) setFlyTarget({ lat: pinLat, lng: pinLng })
  }, [pinLat, pinLng, flyOnChange])

  function handlePlace(lat: number, lng: number) {
    setPos([lat, lng])
    setFlyTarget(null)   // ไม่ต้องบินเพราะผู้ใช้เลือกเอง
    onSelect(lat, lng)
  }

  return (
    <MapContainer
      center={[pinLat, pinLng]}
      zoom={15}
      style={{ height: '280px', width: '100%', borderRadius: '12px', zIndex: 0 }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* บินไปตำแหน่งใหม่ (เฉพาะตอนกด geolocation) */}
      {flyTarget && <FlyTo lat={flyTarget.lat} lng={flyTarget.lng} />}

      {/* จุดร้าน — สีส้ม */}
      <Marker position={[storeLat, storeLng]} icon={storeIcon} />

      {/* หมุดลูกค้า — ลากได้ */}
      <Marker
        position={pos}
        icon={userIcon}
        draggable
        eventHandlers={{
          dragend: (e) => {
            const { lat, lng } = (e.target as L.Marker).getLatLng()
            handlePlace(lat, lng)
          },
        }}
      />

      {/* คลิกบนแผนที่เพื่อย้ายหมุด */}
      <ClickHandler onPlace={handlePlace} />
    </MapContainer>
  )
}
