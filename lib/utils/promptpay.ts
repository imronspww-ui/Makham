import generatePayload from 'promptpay-qr'
import QRCode from 'qrcode'

export async function generatePromptPayQR(phone: string, amount: number): Promise<string> {
  const payload = generatePayload(phone, { amount })
  const dataUrl = await QRCode.toDataURL(payload, {
    width: 280,
    margin: 2,
    color: { dark: '#1a1a1a', light: '#ffffff' },
  })
  return dataUrl
}
