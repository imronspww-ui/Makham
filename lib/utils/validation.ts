import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().min(1, 'กรุณากรอกอีเมล').email('รูปแบบอีเมลไม่ถูกต้อง'),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
})

export const checkoutSchema = z.object({
  customerName: z.string().optional(),
  customerPhone: z
    .string()
    .optional()
    .refine(
      (v) => !v || (v.length >= 9 && v.length <= 10 && /^[0-9]+$/.test(v)),
      'กรุณากรอกเบอร์โทรที่ถูกต้อง (9-10 หลัก)'
    ),
  note: z.string().optional(),
})

export const menuItemSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อเมนู'),
  description: z.string(),
  price: z.number().min(0, 'ราคาต้องไม่ติดลบ'),
  categoryId: z.string().min(1, 'กรุณาเลือกหมวดหมู่'),
  imageUrl: z.string(),
  isAvailable: z.boolean(),
  isSoldOut: z.boolean(),
})

export const categorySchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อหมวดหมู่'),
  sortOrder: z.number(),
  isActive: z.boolean(),
})

export const promptpaySettingsSchema = z.object({
  phone: z
    .string()
    .min(10, 'กรุณากรอกเบอร์พร้อมเพย์ให้ครบ')
    .max(13, 'เบอร์พร้อมเพย์ไม่ถูกต้อง')
    .regex(/^[0-9]+$/, 'กรุณากรอกเฉพาะตัวเลข'),
  accountName: z.string().min(1, 'กรุณากรอกชื่อบัญชี'),
})

export const deliverySettingsSchema = z.object({
  pricePerKm: z.number().min(0, 'ต้องไม่ติดลบ'),
  minDistance: z.number().min(0, 'ต้องไม่ติดลบ'),
  minFee: z.number().min(0, 'ต้องไม่ติดลบ'),
  maxDistance: z.number().min(1, 'ต้องมากกว่า 0'),
})

export type LoginFormData = z.infer<typeof loginSchema>
export type CheckoutFormData = z.infer<typeof checkoutSchema>
export type MenuItemFormData = z.infer<typeof menuItemSchema>
export type CategoryFormData = z.infer<typeof categorySchema>
export type PromptPayFormData = z.infer<typeof promptpaySettingsSchema>
export type DeliverySettingsFormData = z.infer<typeof deliverySettingsSchema>
