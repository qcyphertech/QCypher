// Discount math shared by every surface that shows order pricing — the
// tenant-facing order detail page, the customer-facing quote and invoice
// pages, and the add-line-item form. Mirrors exactly what the database
// triggers compute for orders.total_amount (see
// supabase/migrations/20260830000003_order_discounts.sql), so a preview
// shown before saving never disagrees with the stored total.

export type DiscountType = 'percent' | 'flat'

export type Discountable = {
  discount_type?: DiscountType | string | null
  discount_value?: number | null
}

export function applyDiscount(amount: number, d: Discountable): number {
  if (d.discount_type === 'percent' && d.discount_value != null) {
    return Math.max(amount * (1 - d.discount_value / 100), 0)
  }
  if (d.discount_type === 'flat' && d.discount_value != null) {
    return Math.max(amount - d.discount_value, 0)
  }
  return amount
}

export function hasDiscount(d: Discountable): boolean {
  return (d.discount_type === 'percent' || d.discount_type === 'flat') && d.discount_value != null && d.discount_value > 0
}

export function lineItemPricing(line: { quantity: number; unit_price: number } & Discountable) {
  const original = Number(line.quantity) * Number(line.unit_price)
  const discounted = applyDiscount(original, line)
  return { original, discounted, discountAmount: original - discounted }
}

export function orderPricing(
  lines: ({ quantity: number; unit_price: number } & Discountable)[],
  order: Discountable,
) {
  const subtotalOriginal = lines.reduce((s, l) => s + Number(l.quantity) * Number(l.unit_price), 0)
  const subtotalAfterLineDiscounts = lines.reduce((s, l) => s + lineItemPricing(l).discounted, 0)
  const finalTotal = applyDiscount(subtotalAfterLineDiscounts, order)
  return {
    subtotalOriginal,
    subtotalAfterLineDiscounts,
    lineDiscountTotal: subtotalOriginal - subtotalAfterLineDiscounts,
    orderDiscountAmount: subtotalAfterLineDiscounts - finalTotal,
    finalTotal,
  }
}

export function formatDiscount(d: Discountable): string {
  if (!hasDiscount(d)) return ''
  return d.discount_type === 'percent' ? `${d.discount_value}% off` : `$${Number(d.discount_value).toFixed(2)} off`
}
