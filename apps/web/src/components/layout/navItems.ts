import {
  LayoutDashboard, Users, Calendar,
  Package, ShoppingBag, FileText, Settings, ShieldCheck, Home, Wallet,
  HelpCircle, BarChart2,
} from 'lucide-react'
import { type TenantSettings } from '@/lib/types/settings'

export type NavItem = {
  href:  string
  label: string
  icon:  React.ElementType
  color: string
  bg:    string
  flag:  keyof TenantSettings | null
}

export const HOME_ITEM: NavItem = {
  href: '/dashboard', label: 'Dashboard', icon: Home,
  color: '#2a52a0', bg: 'rgba(42,82,160,0.12)', flag: null,
}

export const PRIMARY_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, color: '#4a9db5', bg: 'rgba(74,157,181,0.12)',  flag: null },
  { href: '/contacts',  label: 'Contacts',  icon: Users,           color: '#10b981', bg: 'rgba(16,185,129,0.12)', flag: null },
  { href: '/orders',    label: 'Orders',    icon: ShoppingBag,     color: '#f97316', bg: 'rgba(249,115,22,0.12)', flag: 'show_orders' },
  { href: '/calendar',  label: 'Calendar',  icon: Calendar,        color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', flag: 'show_calendar' },
  { href: '/overview',  label: 'Overview',  icon: BarChart2,       color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  flag: 'show_overview' },
]

export const SECONDARY_NAV: NavItem[] = [
  { href: '/inventory', label: 'Inventory', icon: Package,     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   flag: 'show_catalog'   },
  { href: '/payments',  label: 'Payments',  icon: Wallet,      color: '#2a52a0', bg: 'rgba(42,82,160,0.12)',   flag: 'show_orders'    },
  { href: '/templates', label: 'Templates', icon: FileText,    color: '#a855f7', bg: 'rgba(168,85,247,0.12)',  flag: 'show_templates' },
  { href: '/support',   label: 'Support',   icon: HelpCircle,  color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)',  flag: null             },
  { href: '/settings',  label: 'Settings',  icon: Settings,    color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', flag: null             },
]

export const ADMIN_ITEM: NavItem = {
  href: '/admin', label: 'Admin', icon: ShieldCheck,
  color: '#f472b6', bg: 'rgba(244,114,182,0.12)', flag: null,
}
