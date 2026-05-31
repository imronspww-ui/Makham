'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Navigation, Loader2, Map } from 'lucide-react'
import { useCheckoutStore } from '@/store/checkoutStore'
import { useSettings } from '@/lib/hooks/useSettings'
import { calculateDistance, calculateDeliveryFee } from '@/lib/utils/delivery'
import { formatCurrency, formatDistance } from '@/lib/utils/format'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

// Dynamic import — ไม่ render บน server (Leaflet ต้องการ window/document)
const MapPicker = dynamic(
  () => import('./MapPickerLeaflet').then((m) => ({ default: m.MapPickerLeaflet })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] w-full rounded-xl bg-gray-100 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Loader2 size={16} className="animate-spin" />
          กำลังโหลดแผนที่...
        </div>
      </div>
    ),
  },
)

export function LocationPicker() {
  const { settings } = useSettings()
  const { lat, lng, distanceKm, deliveryFee, address, setLocation } = useCheckoutStore()

  const [detecting,     setDetecting]     = useState(false)
  const [manualAddress, setManualAddress] = useState(address)
  const [geoError,      setGeoError]      = useState<string | null>(null)
  const [showMap,       setShowMap]       = useState(false)
  const [flyKey,        setFlyKey]        = useState(0)   // เพิ่มทุกครั้งที่ geo เปลี่ยน เพื่อ trigger FlyTo

  const delivConfig = settings?.delivery ?? { pricePerKm: 10, minDistance: 1, minFee: 30, maxDistance: 20 }
  const storeLat    = settings?.store.lat ?? parseFloat(process.env.NEXT_PUBLIC_STORE_LAT ?? '13.7563')
  const storeLng    = settings?.store.lng ?? parseFloat(process.env.NEXT_PUBLIC_STORE_LNG ?? '100.5018')

  // ── Helper: คำนวณระยะ + ค่าส่งแล้ว save ลง store ─────────────────────────
  function applyCoords(userLat: number, userLng: number, addr?: string) {
    const dist = calculateDistance(storeLat, storeLng, userLat, userLng)
    const { fee, isOutOfRange } = calculateDeliveryFee(dist, delivConfig)
    if (isOutOfRange) {
      setGeoError(`ระยะทาง ${dist.toFixed(1)} กม. เกินระยะจัดส่งสูงสุด (${delivConfig.maxDistance} กม.)`)
      return false
    }
    setGeoError(null)
    const finalAddr = addr ?? (manualAddress || `${userLat.toFixed(5)}, ${userLng.toFixed(5)}`)
    setLocation({ lat: userLat, lng: userLng, distanceKm: dist, deliveryFee: fee, address: finalAddr })
    return true
  }

  // ── กดใช้ตำแหน่งปัจจุบัน (Geolocation API) ────────────────────────────────
  function detectLocation() {
    if (!navigator.geolocation) {
      setGeoError('เบราว์เซอร์นี้ไม่รองรับการตรวจสอบตำแหน่ง')
      return
    }
    setDetecting(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const ok = applyCoords(pos.coords.latitude, pos.coords.longitude)
        if (ok) {
          setShowMap(true)   // เปิดแผนที่ให้เห็นตำแหน่งทันที
          setFlyKey((k) => k + 1)
        }
        setDetecting(false)
      },
      () => {
        setGeoError('ไม่สามารถรับตำแหน่งได้ กรุณาเลือกตำแหน่งบนแผนที่ด้วยตนเอง')
        setDetecting(false)
      },
    )
  }

  // ── เมื่อผู้ใช้แก้ช่องที่อยู่ด้วยมือ ────────────────────────────────────────
  function applyManualAddress() {
    if (!lat || !lng) return
    setLocation({ lat, lng, distanceKm: distanceKm!, deliveryFee: deliveryFee!, address: manualAddress })
  }

  // ── เมื่อลากหมุด / คลิกบนแผนที่ ────────────────────────────────────────────
  function handleMapSelect(selectedLat: number, selectedLng: number) {
    applyCoords(selectedLat, selectedLng)
  }

  // ค่า pin บนแผนที่ = ตำแหน่งที่เลือกไว้ หรือตำแหน่งร้านถ้ายังไม่มี
  const pinLat = lat ?? storeLat
  const pinLng = lng ?? storeLng

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 text-gray-700">
        <MapPin size={18} className="text-orange-500" />
        <span className="font-medium text-sm">ที่อยู่จัดส่ง</span>
      </div>

      {/* ── ช่องกรอกที่อยู่ ── */}
      <Input
        placeholder="กรอกที่อยู่จัดส่ง เช่น บ้านเลขที่, ซอย, ถนน"
        value={manualAddress}
        onChange={(e) => setManualAddress(e.target.value)}
        onBlur={applyManualAddress}
      />

      {/* ── ปุ่มต่างๆ ── */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" loading={detecting} onClick={detectLocation} className="flex items-center gap-1.5">
          <Navigation size={14} />
          ใช้ตำแหน่งปัจจุบัน
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMap((v) => !v)}
          className={`flex items-center gap-1.5 ${showMap ? 'border-orange-400 text-orange-600' : ''}`}
        >
          <Map size={14} />
          {showMap ? 'ซ่อนแผนที่' : 'ปักหมุดบนแผนที่'}
        </Button>
      </div>

      {geoError && <p className="text-xs text-red-500">{geoError}</p>}

      {/* ── แผนที่ ── */}
      {showMap && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-gray-500">
            🗺️ จุดสีส้ม = ร้าน &nbsp;|&nbsp; หมุดสีน้ำเงิน = ที่อยู่ของคุณ
            <br />
            แตะแผนที่หรือลากหมุดสีน้ำเงินเพื่อกำหนดตำแหน่งส่ง
          </p>
          <MapPicker
            pinLat={pinLat}
            pinLng={pinLng}
            storeLat={storeLat}
            storeLng={storeLng}
            flyOnChange={flyKey > 0}
            onSelect={handleMapSelect}
          />
          {lat && lng && (
            <p className="text-xs text-green-600 font-medium">
              📍 บันทึกตำแหน่งแล้ว ({lat.toFixed(5)}, {lng.toFixed(5)})
            </p>
          )}
        </div>
      )}

      {/* ── สรุประยะ + ค่าส่ง ── */}
      {lat && lng && distanceKm !== null && deliveryFee !== null && (
        <div className="rounded-xl bg-orange-50 border border-orange-200 p-3 flex flex-col gap-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">ระยะทาง</span>
            <span className="font-medium">{formatDistance(distanceKm)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">ค่าจัดส่ง</span>
            <span className="font-semibold text-orange-600">{formatCurrency(deliveryFee)}</span>
          </div>
        </div>
      )}

      {!lat && !showMap && (
        <p className="text-xs text-gray-400">
          กดปุ่มด้านบนเพื่อตรวจสอบตำแหน่งอัตโนมัติ หรือเลือกจากแผนที่
        </p>
      )}
    </div>
  )
}
