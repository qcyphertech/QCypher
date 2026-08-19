import { Sparkles, Gift, Wrench, Star, Zap, TrendingUp, Lightbulb, type LucideProps } from 'lucide-react'

// Upsell rules used to let tenants type a free-text emoji into
// bundle_emoji_icon — replaced with a curated icon-key picker (see
// UpsellRulesPanel) so the column now holds one of these keys instead of
// a raw emoji character. The column name is unchanged to avoid a schema
// migration; only the values it stores changed meaning.
export const BUNDLE_ICON_OPTIONS = [
  { key: 'sparkles', label: 'Sparkles', icon: Sparkles },
  { key: 'gift', label: 'Gift', icon: Gift },
  { key: 'wrench', label: 'Wrench', icon: Wrench },
  { key: 'star', label: 'Star', icon: Star },
  { key: 'zap', label: 'Lightning', icon: Zap },
  { key: 'trending-up', label: 'Trending up', icon: TrendingUp },
] as const

export type BundleIconKey = typeof BUNDLE_ICON_OPTIONS[number]['key']

const ICON_BY_KEY: Record<string, typeof Lightbulb> = Object.fromEntries(
  BUNDLE_ICON_OPTIONS.map(o => [o.key, o.icon]),
)

export function BundleIcon({ iconKey, ...props }: { iconKey?: string | null } & LucideProps) {
  const Icon = (iconKey && ICON_BY_KEY[iconKey]) || Lightbulb
  return <Icon fill="currentColor" strokeWidth={1} {...props} />
}
