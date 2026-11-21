import { z } from "zod";

const email = z.string().trim().toLowerCase().email("Enter a valid email").max(254);
export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128)
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[0-9]/, "Include a number");

// NOTE: no `role` field anywhere in public schemas. Roles are never accepted from clients.
export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email,
  password: passwordSchema,
  newsletter: z.boolean().optional().default(false),
});
export const loginSchema = z.object({ email, password: z.string().min(1).max(128) });
export const forgotSchema = z.object({ email });
export const resetSchema = z.object({ token: z.string().min(32).max(128), password: passwordSchema });
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1), newPassword: passwordSchema });
export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  newsletter: z.boolean().optional().default(false),
});

export const addressSchema = z.object({
  label: z.string().trim().max(40).optional(),
  fullName: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(5).max(30),
  line1: z.string().trim().min(3).max(120),
  line2: z.string().trim().max(120).optional().or(z.literal("")),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().max(80).optional().or(z.literal("")),
  postalCode: z.string().trim().min(2).max(20),
  country: z.string().trim().min(2).max(60),
  isDefault: z.boolean().optional().default(false),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const cartAddSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).nullable().optional(),
  quantity: z.number().int().min(1).max(50),
});
export const cartUpdateSchema = z.object({ itemId: z.string().min(1), quantity: z.number().int().min(0).max(50) });

export const checkoutSchema = z.object({
  email,
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  billingSameAsShipping: z.boolean().default(true),
  shippingMethod: z.enum(["standard", "express"]),
  paymentMethod: z.enum(["STRIPE", "COD"]),
  couponCode: z.string().trim().toUpperCase().max(40).optional().or(z.literal("")),
  idempotencyKey: z.string().min(16).max(80),
  notes: z.string().trim().max(500).optional(),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(100).optional(),
  body: z.string().trim().min(10).max(2000),
});

export const productSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    sku: z.string().trim().min(2).max(60),
    description: z.string().trim().min(10).max(10_000),
    brand: z.string().trim().max(80).optional().or(z.literal("")),
    price: z.coerce.number().positive().max(1_000_000),
    salePrice: z.coerce.number().positive().max(1_000_000).optional().or(z.literal("").transform(() => undefined)),
    stock: z.coerce.number().int().min(0).max(1_000_000),
    lowStockAt: z.coerce.number().int().min(0).max(10_000).default(5),
    categoryId: z.string().optional().or(z.literal("")),
    isPublished: z.coerce.boolean().default(false),
    isFeatured: z.coerce.boolean().default(false),
  })
  .refine((v) => v.salePrice === undefined || v.salePrice < v.price, {
    message: "Sale price must be lower than price",
    path: ["salePrice"],
  });

export const variantSchema = z.object({
  sku: z.string().trim().min(2).max(60),
  size: z.string().trim().max(30).optional().or(z.literal("")),
  color: z.string().trim().max(30).optional().or(z.literal("")),
  price: z.coerce.number().positive().optional().or(z.literal("").transform(() => undefined)),
  stock: z.coerce.number().int().min(0).max(1_000_000),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  parentId: z.string().optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
});

export const couponSchema = z
  .object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, "3-30 letters, numbers, - or _"),
    type: z.enum(["PERCENTAGE", "FIXED"]),
    value: z.coerce.number().positive(),
    minSubtotal: z.coerce.number().min(0).default(0),
    usageLimit: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
    perUserLimit: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
    expiresAt: z.string().optional().or(z.literal("")),
    isActive: z.coerce.boolean().default(true),
  })
  .refine((v) => v.type !== "PERCENTAGE" || v.value <= 100, { message: "Percentage must be ≤ 100", path: ["value"] });

export const orderStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]),
  trackingNumber: z.string().trim().max(80).optional(),
  carrier: z.string().trim().max(40).optional(),
});

export const stockAdjustSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional().nullable(),
  change: z.coerce.number().int().min(-1_000_000).max(1_000_000).refine((n) => n !== 0, "Change cannot be 0"),
  note: z.string().trim().max(200).optional(),
});

export const settingsSchema = z.object({
  storeName: z.string().trim().min(1).max(80),
  contactEmail: email,
  contactPhone: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  currency: z.string().trim().toLowerCase().length(3),
  shippingFlat: z.coerce.number().min(0),
  expressShipping: z.coerce.number().min(0),
  freeShippingOver: z.coerce.number().min(0),
  taxRatePercent: z.coerce.number().min(0).max(50),
  lowStockEmail: email.optional().or(z.literal("")),
  notifyNewOrders: z.coerce.boolean().default(false),
});

export const bannerSchema = z.object({
  title: z.string().trim().min(2).max(100),
  subtitle: z.string().trim().max(200).optional().or(z.literal("")),
  image: z.string().url(),
  ctaLabel: z.string().trim().max(40).optional().or(z.literal("")),
  ctaHref: z.string().trim().max(200).optional().or(z.literal("")),
  position: z.coerce.number().int().min(0).default(0),
  isActive: z.coerce.boolean().default(true),
});

export const newsletterSchema = z.object({ email });
export const contactSchema = z.object({ name: z.string().trim().min(2).max(80), email, message: z.string().trim().min(10).max(2000) });
