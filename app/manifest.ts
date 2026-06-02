import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  const name = process.env.NEXT_PUBLIC_STORE_NAME ?? 'ร้านมะขาม'
  return {
    name,
    short_name: name,
    description: 'ระบบจัดการร้านอาหาร',
    start_url: '/admin/pos',
    display: 'standalone',
    orientation: 'landscape',
    background_color: '#111111',
    theme_color: '#f97316',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
