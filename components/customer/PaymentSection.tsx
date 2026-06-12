'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { QrCode, Banknote, Loader2 } from 'lucide-react'
import { useCheckoutStore } from '@/store/checkoutStore'
import { useCartStore } from '@/store/cartStore'
import { useSettings } from '@/lib/hooks/useSettings'
import { generatePromptPayQR } from '@/lib/utils/promptpay'
import { formatCurrency } from '@/lib/utils/format'
import type { PaymentMethod } from '@/types'

export function PaymentSection() {
  const { paymentMethod, setPaymentMethod, deliveryFee } = useCheckoutStore()
  const { getTotalPrice } = useCartStore()
  const { settings } = useSettings()
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [loadingQr, setLoadingQr] = useState(false)

  const total = getTotalPrice() + (deliveryFee ?? 0)
  const promptpay = settings?.promptpay

  useEffect(() => {
    if ((paymentMethod === 'promptpay' || paymentMethod === 'thaichangthai') && promptpay?.phone) {
      setLoadingQr(true)
      generatePromptPayQR(promptpay.phone, total)
        .then(setQrUrl)
        .catch(() => setQrUrl(null))
        .finally(() => setLoadingQr(false))
    } else {
      setQrUrl(null)
    }
  }, [paymentMethod, promptpay?.phone, total])

  const options: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
    { value: 'promptpay', label: 'QR PromptPay', icon: <QrCode size={18} /> },
    { value: 'thaichangthai', label: 'ไทยช่วยไทยพลัส', icon: <span className="text-base leading-none">🇹🇭</span> },
    { value: 'cash', label: 'เงินสด', icon: <Banknote size={18} /> },
  ]

  const customerPays = Math.ceil(total * 0.6)
  const govPays = total - customerPays

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setPaymentMethod(opt.value)}
            className={[
              'flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 text-xs font-medium transition-all',
              paymentMethod === opt.value
                ? 'border-orange-600 bg-orange-50 text-orange-600'
                : 'border-gray-200 text-gray-600 hover:border-orange-300',
            ].join(' ')}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </div>

      {paymentMethod === 'promptpay' && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4">
          {loadingQr ? (
            <div className="flex items-center gap-2 py-8 text-gray-400">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">กำลังสร้าง QR Code...</span>
            </div>
          ) : qrUrl ? (
            <>
              <Image src={qrUrl} alt="PromptPay QR" width={220} height={220} className="rounded-xl" />
              {promptpay && (
                <div className="text-center text-sm">
                  <p className="text-gray-600">พร้อมเพย์: <span className="font-semibold">{promptpay.phone}</span></p>
                  <p className="text-gray-600">ชื่อบัญชี: <span className="font-semibold">{promptpay.accountName}</span></p>
                  <p className="mt-1 text-base font-bold text-orange-600">ยอดที่ต้องชำระ {formatCurrency(total)}</p>
                </div>
              )}
            </>
          ) : (
            <p className="py-4 text-sm text-gray-400">
              {promptpay?.phone ? 'ไม่สามารถสร้าง QR ได้' : 'ยังไม่มีข้อมูล PromptPay กรุณาติดต่อร้าน'}
            </p>
          )}
        </div>
      )}

      {paymentMethod === 'thaichangthai' && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          {loadingQr ? (
            <div className="flex items-center gap-2 py-8 text-gray-400">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">กำลังสร้าง QR Code...</span>
            </div>
          ) : qrUrl ? (
            <>
              <Image src={qrUrl} alt="ไทยช่วยไทยพลัส QR" width={220} height={220} className="rounded-xl" />
              {promptpay && (
                <div className="text-center text-sm">
                  <p className="text-gray-600">พร้อมเพย์: <span className="font-semibold">{promptpay.phone}</span></p>
                  <p className="text-gray-600">ชื่อบัญชี: <span className="font-semibold">{promptpay.accountName}</span></p>
                  <p className="mt-1 text-base font-bold text-blue-600">ยอดที่ต้องชำระ {formatCurrency(total)}</p>
                  <p className="mt-1 text-xs text-blue-500">เปิดแอปเป๋าตัง → ไทยช่วยไทยพลัส → สแกน QR นี้</p>
                  <p className="mt-1 text-xs text-red-500 font-medium">⚠️ ต้องสแกนด้วยแอปเป๋าตังเท่านั้น หากสแกนด้วยแอปอื่นจะไม่ได้รับสิทธิ์ลด 40%</p>
                </div>
              )}
            </>
          ) : (
            <p className="py-4 text-sm text-gray-400">
              {promptpay?.phone ? 'ไม่สามารถสร้าง QR ได้' : 'ยังไม่มีข้อมูล PromptPay กรุณาติดต่อร้าน'}
            </p>
          )}
        </div>
      )}

      {paymentMethod === 'cash' && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
          ชำระเงินสดเมื่อรับสินค้า / เมื่อพนักงานจัดส่งถึงที่
        </div>
      )}
    </div>
  )
}

