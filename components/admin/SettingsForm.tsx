'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import dynamic from 'next/dynamic'
import toast from 'react-hot-toast'
import { Navigation, Loader2, Map } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { promptpaySettingsSchema, deliverySettingsSchema, storeSettingsSchema, type PromptPayFormData, type DeliverySettingsFormData, type StoreSettingsFormData } from '@/lib/utils/validation'
import { updatePromptPaySettings, updateDeliverySettings, updateStoreSettings, toggleDeliveryEnabled } from '@/lib/services/settingsService'
import { generatePromptPayQR } from '@/lib/utils/promptpay'
import type { Settings } from '@/types'
import Image from 'next/image'

// Dynamic import — Leaflet ต้องการ window/document (ไม่ render บน server)
const MapPicker = dynamic(
  () => import('@/components/customer/MapPickerLeaflet').then((m) => ({ default: m.MapPickerLeaflet })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[200px] w-full rounded-xl bg-gray-100 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Loader2 size={16} className="animate-spin" />
          กำลังโหลดแผนที่...
        </div>
      </div>
    ),
  },
)

interface Props {
  settings: Settings
  onSaved: () => void
}

export function PromptPaySettingsForm({ settings, onSaved }: Props) {
  const [saving, setSaving] = useState(false)
  const [previewQr, setPreviewQr] = useState<string | null>(null)
  const { register, handleSubmit, watch, formState: { errors } } = useForm<PromptPayFormData>({
    resolver: zodResolver(promptpaySettingsSchema),
    defaultValues: settings.promptpay,
  })
  const phone = watch('phone')

  useEffect(() => {
    if (phone && phone.length >= 10) {
      generatePromptPayQR(phone, 0).then(setPreviewQr).catch(() => setPreviewQr(null))
    }
  }, [phone])

  async function onSubmit(data: PromptPayFormData) {
    setSaving(true)
    try {
      await updatePromptPaySettings(data)
      toast.success('บันทึกข้อมูล PromptPay สำเร็จ')
      onSaved()
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-4">
          <Input label="เบอร์พร้อมเพย์ *" {...register('phone')} error={errors.phone?.message} placeholder="0812345678" />
          <Input label="ชื่อบัญชี *" {...register('accountName')} error={errors.accountName?.message} placeholder="ชื่อบัญชีธนาคาร" />
        </div>
        {previewQr && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-gray-400">ตัวอย่าง QR Code</p>
            <Image src={previewQr} alt="QR Preview" width={150} height={150} className="rounded-xl border border-gray-200" />
          </div>
        )}
      </div>
      <Button type="submit" loading={saving} className="self-start">บันทึกข้อมูล PromptPay</Button>
    </form>
  )
}

export function DeliverySettingsForm({ settings, onSaved }: Props) {
  const [saving,    setSaving]    = useState(false)
  const [toggling,  setToggling]  = useState(false)
  const [enabled,   setEnabled]   = useState(settings.delivery.enabled ?? true)

  const { register, handleSubmit, formState: { errors } } = useForm<DeliverySettingsFormData>({
    resolver: zodResolver(deliverySettingsSchema),
    defaultValues: {
      freeFirstKm:    settings.delivery.freeFirstKm ?? 0,
      minOrderAmount: settings.delivery.minOrderAmount ?? 0,
      pricePerKm:     settings.delivery.pricePerKm,
      minDistance:    settings.delivery.minDistance,
      minFee:         settings.delivery.minFee,
      maxDistance:    settings.delivery.maxDistance,
    },
  })

  async function handleToggle() {
    setToggling(true)
    try {
      const next = !enabled
      await toggleDeliveryEnabled(next)
      setEnabled(next)
      toast.success(next ? '🟢 เปิดบริการจัดส่งแล้ว' : '🔴 ปิดบริการจัดส่งชั่วคราวแล้ว')
      onSaved()
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    } finally {
      setToggling(false)
    }
  }

  async function onSubmit(data: DeliverySettingsFormData) {
    setSaving(true)
    try {
      await updateDeliverySettings({ ...data, enabled })
      toast.success('บันทึกการตั้งค่าจัดส่งสำเร็จ')
      onSaved()
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* ── Toggle เปิด/ปิดบริการ ── */}
      <div className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 transition-colors ${
        enabled ? 'border-green-300 bg-green-50' : 'border-red-200 bg-red-50'
      }`}>
        <div>
          <p className={`font-semibold text-sm ${enabled ? 'text-green-700' : 'text-red-600'}`}>
            {enabled ? '🟢 เปิดให้บริการจัดส่ง' : '🔴 ปิดให้บริการชั่วคราว'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {enabled
              ? 'ลูกค้าสามารถเลือก "จัดส่ง" ได้ในหน้าตะกร้า'
              : 'ปุ่มจัดส่งในหน้าตะกร้าจะถูกปิด ลูกค้าเลือกได้เฉพาะ "รับหน้าร้าน"'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          disabled={toggling}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all disabled:opacity-60 ${
            enabled
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-green-500 text-white hover:bg-green-600'
          }`}
        >
          {toggling
            ? <span className="animate-spin">⏳</span>
            : enabled ? 'ปิดชั่วคราว' : 'เปิดบริการ'}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {/* ── ยอดสั่งขั้นต่ำ ── */}
        <div className="flex flex-col gap-1 col-span-2">
          <label className="text-sm font-medium text-gray-700">
            ยอดสั่งขั้นต่ำสำหรับ Delivery (บาท)
            <span className="ml-1.5 text-xs text-gray-400 font-normal">— ใส่ 0 ถ้าไม่มีขั้นต่ำ</span>
          </label>
          <input type="number" min="0" {...register('minOrderAmount', { valueAsNumber: true })}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 outline-none" />
          {errors.minOrderAmount && <p className="text-xs text-red-500">{errors.minOrderAmount.message}</p>}
          <p className="text-xs text-gray-400">เช่น ใส่ 100 = ลูกค้าต้องซื้อรวมอย่างน้อย ฿100 จึงจะเลือก Delivery ได้</p>
        </div>

        <div className="flex flex-col gap-1 col-span-2">
          <label className="text-sm font-medium text-gray-700">
            กิโลเมตรแรกฟรี (กม.)
            <span className="ml-1.5 text-xs text-gray-400 font-normal">— ใส่ 0 ถ้าไม่มีระยะฟรี</span>
          </label>
          <input type="number" step="0.5" min="0" {...register('freeFirstKm', { valueAsNumber: true })}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 outline-none" />
          {errors.freeFirstKm && <p className="text-xs text-red-500">{errors.freeFirstKm.message}</p>}
          <p className="text-xs text-gray-400">เช่น ใส่ 1 = กม. แรกฟรี, ตั้งแต่ กม. 2 เป็นต้นไปคิดตามราคาต่อ กม.</p>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">ราคาต่อกิโลเมตร (บาท)</label>
          <input type="number" step="0.5" {...register('pricePerKm', { valueAsNumber: true })}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 outline-none" />
          {errors.pricePerKm && <p className="text-xs text-red-500">{errors.pricePerKm.message}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">ค่าส่งขั้นต่ำ (บาท)</label>
          <input type="number" {...register('minFee', { valueAsNumber: true })}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 outline-none" />
          {errors.minFee && <p className="text-xs text-red-500">{errors.minFee.message}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">ระยะทางขั้นต่ำ (กม.)</label>
          <input type="number" step="0.5" {...register('minDistance', { valueAsNumber: true })}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 outline-none" />
          {errors.minDistance && <p className="text-xs text-red-500">{errors.minDistance.message}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">ระยะทางสูงสุด (กม.)</label>
          <input type="number" {...register('maxDistance', { valueAsNumber: true })}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 outline-none" />
          {errors.maxDistance && <p className="text-xs text-red-500">{errors.maxDistance.message}</p>}
        </div>
      </div>
      <Button type="submit" loading={saving} className="self-start">บันทึกการตั้งค่าจัดส่ง</Button>
    </form>
  )
}

const DEFAULT_LAT = 13.7563
const DEFAULT_LNG = 100.5018

export function StoreSettingsForm({ settings, onSaved }: Props) {
  const [saving,       setSaving]       = useState(false)
  const [logoPreview,  setLogoPreview]  = useState(settings.store.logoUrl ?? '')
  const [bgPreview,    setBgPreview]    = useState(settings.store.bgImageUrl ?? '')
  const [detectingLoc, setDetectingLoc] = useState(false)
  const [geoError,     setGeoError]     = useState<string | null>(null)
  const [showLocMap,   setShowLocMap]   = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<StoreSettingsFormData>({
    resolver: zodResolver(storeSettingsSchema),
    defaultValues: {
      name:         settings.store.name,
      description:  settings.store.description ?? '',
      announcement: settings.store.announcement ?? '',
      logoUrl:      settings.store.logoUrl ?? '',
      bannerUrl:    settings.store.bannerUrl ?? '',
      bgImageUrl:   settings.store.bgImageUrl ?? '',
      lat:          settings.store.lat,
      lng:          settings.store.lng,
    },
  })

  const logoVal = watch('logoUrl')
  const bgVal   = watch('bgImageUrl')
  const latVal  = watch('lat')
  const lngVal  = watch('lng')

  useEffect(() => { setLogoPreview(logoVal ?? '') }, [logoVal])
  useEffect(() => { setBgPreview(bgVal ?? '') }, [bgVal])

  const hasLocation = latVal && lngVal && !isNaN(latVal) && !isNaN(lngVal)
  const pinLat = hasLocation ? latVal : DEFAULT_LAT
  const pinLng = hasLocation ? lngVal : DEFAULT_LNG

  function detectStoreLocation() {
    if (!navigator.geolocation) {
      setGeoError('เบราว์เซอร์นี้ไม่รองรับการตรวจสอบตำแหน่ง')
      return
    }
    setDetectingLoc(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue('lat', pos.coords.latitude)
        setValue('lng', pos.coords.longitude)
        setShowLocMap(true)
        setDetectingLoc(false)
      },
      () => {
        setGeoError('ไม่สามารถรับตำแหน่งได้ กรุณากรอกพิกัดด้วยตนเอง')
        setDetectingLoc(false)
      },
    )
  }

  async function onSubmit(data: StoreSettingsFormData) {
    setSaving(true)
    try {
      await updateStoreSettings({
        ...settings.store,
        name:         data.name,
        description:  data.description  || undefined,
        announcement: data.announcement || undefined,
        logoUrl:      data.logoUrl      || undefined,
        bannerUrl:    data.bannerUrl    || undefined,
        bgImageUrl:   data.bgImageUrl   || undefined,
        ...(data.lat && data.lng && !isNaN(data.lat) && !isNaN(data.lng)
          ? { lat: data.lat, lng: data.lng }
          : {}),
      })
      toast.success('บันทึกข้อมูลร้านสำเร็จ')
      onSaved()
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input
        label="ชื่อร้าน *"
        {...register('name')}
        error={errors.name?.message}
        placeholder="ร้านมะขาม"
      />

      <Input
        label="คำอธิบายร้าน"
        {...register('description')}
        placeholder="เช่น ลาบ ส้มตำ อาหารอีสาน รสต้นตำรับ · ส่งถึงโต๊ะ"
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">ประกาศ / โปรโมชัน</label>
        <textarea
          {...register('announcement')}
          rows={2}
          placeholder="เช่น โปรวันนี้! สั่ง 2 ได้ 1 ฟรี เมนูลูกชิ้นปิ้งทุกชนิด (ถ้าว่างจะไม่แสดง)"
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 outline-none resize-none"
        />
      </div>

      {/* Logo URL */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">URL โลโก้</label>
        <div className="flex gap-3 items-start">
          <div className="flex-1">
            <input
              {...register('logoUrl')}
              placeholder="https://example.com/logo.png"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">วาง URL รูปภาพโลโก้ร้าน (แนะนำสี่เหลี่ยมจัตุรัส)</p>
          </div>
          {logoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoPreview} alt="logo preview"
              className="h-12 w-12 rounded-xl object-cover border border-gray-200 flex-shrink-0"
              onError={() => setLogoPreview('')} />
          ) : (
            <div className="h-12 w-12 rounded-xl bg-gray-100 border border-dashed border-gray-300 flex-shrink-0 flex items-center justify-center text-gray-300 text-xs">โลโก้</div>
          )}
        </div>
      </div>

      {/* Banner/Cover URL */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">URL รูป Cover (header card)</label>
        <input
          {...register('bannerUrl')}
          placeholder="https://example.com/cover.jpg"
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 outline-none"
        />
        <p className="text-xs text-gray-400">รูปแบนเนอร์ด้านบนการ์ดชื่อร้าน (แนะนำสัดส่วน 16:5)</p>
      </div>

      {/* Background URL */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">URL รูปพื้นหลัง</label>
        <div className="flex gap-3 items-start">
          <div className="flex-1">
            <input
              {...register('bgImageUrl')}
              placeholder="https://example.com/background.jpg"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">วาง URL รูปภาพพื้นหลัง (ถ้าไม่ใส่จะใช้ gradient สีส้ม-เขียว)</p>
          </div>
          {bgPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bgPreview} alt="bg preview"
              className="h-12 w-20 rounded-xl object-cover border border-gray-200 flex-shrink-0"
              onError={() => setBgPreview('')} />
          ) : (
            <div className="h-12 w-20 rounded-xl flex-shrink-0 border border-dashed border-gray-300"
              style={{ background: 'linear-gradient(160deg, #fef6e4 0%, #f0faf4 40%, #fdf2e9 100%)' }} />
          )}
        </div>
      </div>

      {/* ── ตำแหน่งร้าน (สำหรับระบบจัดส่ง) ── */}
      <div className="flex flex-col gap-3 border-t border-gray-100 pt-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-medium text-gray-700">ตำแหน่งร้าน</p>
            {hasLocation ? (
              <p className="text-xs text-green-600 mt-0.5">
                📍 {latVal!.toFixed(5)}, {lngVal!.toFixed(5)}
              </p>
            ) : (
              <p className="text-xs text-amber-500 mt-0.5">
                ⚠️ ยังไม่ได้ตั้งค่า — แผนที่จัดส่งจะใช้พิกัดกรุงเทพแทน
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={detectStoreLocation}
              disabled={detectingLoc}
              className="flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-60"
            >
              {detectingLoc ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
              ตำแหน่งปัจจุบัน
            </button>
            <button
              type="button"
              onClick={() => setShowLocMap((v) => !v)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs ${
                showLocMap ? 'border-orange-400 text-orange-600 bg-orange-50' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Map size={12} />
              {showLocMap ? 'ซ่อนแผนที่' : 'เลือกบนแผนที่'}
            </button>
          </div>
        </div>

        {geoError && <p className="text-xs text-red-500">{geoError}</p>}

        {/* Manual lat/lng inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-gray-500">Latitude (ละติจูด)</label>
            <input
              type="number"
              step="0.00001"
              {...register('lat', { valueAsNumber: true })}
              placeholder="13.76000"
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 outline-none"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-gray-500">Longitude (ลองจิจูด)</label>
            <input
              type="number"
              step="0.00001"
              {...register('lng', { valueAsNumber: true })}
              placeholder="100.50000"
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 outline-none"
            />
          </div>
        </div>
        <p className="text-xs text-gray-400">
          วิธีหาพิกัด: เปิด Google Maps → คลิกขวาที่หน้าร้าน → คัดลอกตัวเลขพิกัด แล้ววางที่ช่องด้านบน
        </p>

        {/* Map picker */}
        {showLocMap && (
          <>
            <p className="text-xs text-gray-500">คลิกหรือลากหมุดสีน้ำเงินเพื่อตั้งตำแหน่งร้าน</p>
            <MapPicker
              pinLat={pinLat}
              pinLng={pinLng}
              storeLat={pinLat}
              storeLng={pinLng}
              flyOnChange={false}
              onSelect={(newLat, newLng) => {
                setValue('lat', newLat)
                setValue('lng', newLng)
              }}
            />
          </>
        )}
      </div>

      <Button type="submit" loading={saving} className="self-start">บันทึกข้อมูลร้าน</Button>
    </form>
  )
}
