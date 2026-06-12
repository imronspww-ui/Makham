export function ThaiChangThaiBanner() {
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
      {/* Top bar */}
      <div className="bg-blue-700 px-4 py-2.5 flex items-center gap-2">
        <span className="text-lg leading-none" aria-hidden="true">🏛️</span>
        <span className="text-sm font-semibold text-white">ไทยช่วยไทยพลัส</span>
        <span className="ml-auto text-[11px] bg-white/20 text-white px-2.5 py-0.5 rounded-full">หน้าร้านเท่านั้น</span>
      </div>
      {/* Body */}
      <div className="bg-white px-4 py-3 flex items-center gap-3">
        <div className="flex gap-2 flex-1">
          <div className="flex-1 bg-blue-50 rounded-xl py-2.5 text-center">
            <p className="text-lg font-semibold text-blue-700 leading-none">60%</p>
            <p className="text-[11px] text-blue-400 mt-1">คุณจ่าย</p>
          </div>
          <div className="flex-1 bg-green-50 rounded-xl py-2.5 text-center">
            <p className="text-lg font-semibold text-green-600 leading-none">40%</p>
            <p className="text-[11px] text-green-400 mt-1">รัฐจ่าย</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs font-medium text-gray-700">สแกนด้วย</p>
          <p className="text-xs text-gray-400">แอปเป๋าตัง</p>
        </div>
      </div>
    </div>
  )
}

export function ThaiChangThaiInlineNotice() {
  return (
    <div className="flex gap-3 items-start rounded-xl border-l-4 border-blue-600 bg-blue-50 px-3 py-2.5">
      <span className="text-base leading-none mt-0.5" aria-hidden="true">ℹ️</span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-blue-800">ร้านนี้รองรับไทยช่วยไทยพลัส 60/40</p>
        <p className="text-xs text-blue-600 mt-0.5">สแกน QR ด้วยแอปเป๋าตัง รับส่วนลด 40% — ชำระหน้าร้านเท่านั้น</p>
      </div>
      <span className="flex-shrink-0 text-[10px] font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded-full self-center">หน้าร้าน</span>
    </div>
  )
}
