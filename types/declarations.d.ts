declare module 'promptpay-qr' {
  function generatePayload(phoneOrNationalId: string, options?: { amount?: number }): string
  export = generatePayload
}
