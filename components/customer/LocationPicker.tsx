'use client'
import { useState } from 'react'
import { MapPin, Navigation, Loader2 } from 'lucide-react'
import { useCheckoutStore } from '@/store/checkoutStore'
import { useSettings } from '@/lib/hooks/useSettings'
import { calculateDistance, calculateDeliveryFee } from '@/lib/utils/delivery'
import { formatCurrency, formatDistance } from '@/lib/utils/format'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function LocationPicker() {
  const { settings } = useSettings()
  const { lat, lng, distanceKm, deliveryFee, address, setLocation } = useCheckoutStore()
  const [detecting, setDetecting] = useState(false)
  const [manualAddress, setManualAddress] = useState(address)
  const [geoError, setGeoError] = useState<string | null>(null)

  const delivConfig = settings?.delivery ?? { pricePerKm: 10, minDistance: 1, minFee: 30, maxDistance: 20 }
  const storeLat = settings?.store.lat ?? parseFloat(process.env.NEXT_PUBLIC_STORE_LAT ?? '13.7563')
  const storeLng = settings?.store.lng ?? parseFloat(process.env.NEXT_PUBLIC_STORE_LNG ?? '100.5018')

  function detectLocation() {
    if (!navigator.geolocation) {
      setGeoError('เบราว์เซอร์นี้ไม่รองรับการตรวจสอบตำแหน่ง')
      return
    }
    setDetecting(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude
        const userLng = pos.coords.longitude
        const dist = calculateDistance(storeLat, storeLng, userLat, userLng)
        const { fee, isOutOfRange } = calculateDeliveryFee(dist, delivConfig)
        if (isOutOfRange) {
          setGeoError(`ระยะทาง ${dist.toFixed(1)} กม. เกินระยะจัดส่งสูงสุด (${delivConfig.maxDistance} กม.)`)
          setDetecting(false)
          return
        }
        const addr = manualAddress || `${userLat.toFixed(5)}, ${userLng.toFixed(5)}`
        setLocation({ lat: userLat, lng: userLng, distanceKm: dist, deliveryFee: fee, address: addr })
        setDetecting(false)
      },
      () => {
        setGeoError('ไม่สามารถรับตำแหน่งได้ กรุณากรอกที่อยู่ด้วยตนเอง')
        setDetecting(false)
      },
    )
  }

  function applyManualAddress() {
    if (!lat || !lng) return
    setLocation({ lat, lng, distanceKm: distanceKm!, deliveryFee: deliveryFee!, address: manualAddress })
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 text-gray-700">
        <MapPin size={18} className="text-orange-500" />
        <span className="font-medium text-sm">ที่อยู่จัดส่ง</span>
      </div>

      <Input
        placeholder="กรอกที่อยู่จัดส่ง เช่น บ้านเลขที่, ซอย, ถนน"
        value={manualAddress}
        onChange={(e) => setManualAddress(e.target.value)}
        onBlur={applyManualAddress}
      />

      <Button
        variant="outline"
        size="sm"
        loading={detecting}
        onClick={detectLocation}
        className="self-start"
      >
        <Navigation size={14} />
        ใช้ตำแหน่งปัจจุบัน
      </Button>

      {geoError && <p className="text-xs text-red-500">{geoError}</p>}

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

      {!lat && (
        <p className="text-xs text-gray-400">
          กดปุ่มด้านบนเพื่อตรวจสอบตำแหน่งอัตโนมัติ หรือกรอกที่อยู่ด้วยตนเอง
        </p>
      )}
    </div>
  )
}
