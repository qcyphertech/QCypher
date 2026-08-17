import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Security',
  description: 'Learn how QCypher protects your business data. Encryption, access control, monitoring, and transparent practices.',
  alternates: { canonical: 'https://www.qcyphertech.com/security' },
  openGraph: {
    title: 'Security by Design — QCypher Technologies',
    description: 'Encryption, role-based access control, and continuous monitoring — here’s exactly how QCypher protects your business data.',
    url: 'https://www.qcyphertech.com/security',
    type: 'website',
  },
}

const INTEGRATION_LOGOS = [
  { name: 'Google Business Profile', file: '/logos/googlebusiness.png' },
  { name: 'Cal.com', file: '/logos/calcom.png' },
  { name: 'Telnyx', file: '/logos/telnyx.svg' },
  { name: 'Resend', file: '/logos/resend.svg' },
  { name: 'Supabase', file: '/logos/supabase.svg' },
  { name: 'Cloudflare', file: '/logos/cloudflare.svg' },
  { name: 'Vercel', file: '/logos/vercel.svg' },
  { name: 'GitHub', file: '/logos/github.svg' },
  { name: 'Anthropic', file: '/logos/anthropic.png' },
]

// Silhouette icon set — matches the About page's .value-icon treatment
// (single-color stroke glyphs on a colored badge) instead of colorful emoji.
type IconKey =
  | 'lock' | 'shield' | 'eye' | 'alert' | 'folder' | 'building' | 'map' | 'handshake' | 'chat'
  | 'key' | 'unlock' | 'device' | 'layers' | 'search' | 'database' | 'doc' | 'check' | 'xcircle'
  | 'calendar' | 'bolt' | 'dollar' | 'mail' | 'clock' | 'home' | 'upload' | 'trash' | 'box'
  | 'server' | 'link' | 'chart' | 'globe' | 'bot' | 'bug'

const ICON_PATHS: Record<IconKey, React.ReactNode> = {
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  shield: <path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6z" />,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
  alert: <><path d="M12 3l10 18H2z" /><path d="M12 10v4" /><path d="M12 17.5v.01" /></>,
  folder: <path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />,
  building: <><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2" /><path d="M10 21v-4h4v4" /></>,
  map: <><path d="M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2-6-2z" /><path d="M9 4v14M15 6v14" /></>,
  handshake: <path d="M2 12l5-5 3 3 4-4 3 3-4 4-3-3-3 3M12 15l3 3M15 12l4 4" />,
  chat: <path d="M4 4h16v12H9l-5 4z" />,
  key: <><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M17 6l3 3M14 9l2.5 2.5" /></>,
  unlock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 7.5-2" /></>,
  device: <><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></>,
  layers: <><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></>,
  search: <><circle cx="10" cy="10" r="6" /><path d="M20 20l-5.5-5.5" /></>,
  database: <><ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6" /><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></>,
  doc: <><path d="M6 2h9l4 4v16H6z" /><path d="M14 2v5h5" /><path d="M9 12h7M9 16h7" /></>,
  check: <path d="M4 12l6 6L20 6" />,
  xcircle: <><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  bolt: <path d="M13 2L4 14h6l-1 8 9-12h-6z" />,
  dollar: <><circle cx="12" cy="12" r="9" /><path d="M12 6v12M15 9.5c0-1.4-1.3-2.5-3-2.5s-3 1-3 2.5 1.3 2 3 2.5 3 1.1 3 2.5-1.3 2.5-3 2.5-3-1.1-3-2.5" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
  home: <><path d="M4 11l8-7 8 7" /><path d="M6 10v10h12V10" /></>,
  upload: <><path d="M12 16V4M8 8l4-4 4 4" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></>,
  trash: <><path d="M4 7h16" /><path d="M6 7l1 13h10l1-13" /><path d="M10 11v6M14 11v6" /><path d="M9 7V4h6v3" /></>,
  box: <><path d="M3 8l9-5 9 5-9 5-9-5z" /><path d="M3 8v9l9 5 9-5V8" /><path d="M12 13v9" /></>,
  server: <><rect x="3" y="4" width="18" height="6" rx="1.5" /><rect x="3" y="14" width="18" height="6" rx="1.5" /><path d="M7 7h.01M7 17h.01" /></>,
  link: <path d="M9 15l6-6M8 16l-2.5 2.5a3.5 3.5 0 0 1-5-5L3 11M16 8l2.5-2.5a3.5 3.5 0 0 1 5 5L21 13" />,
  chart: <path d="M4 20V10M11 20V4M18 20v-7" />,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
  bot: <><rect x="5" y="9" width="14" height="10" rx="2" /><path d="M12 5v4M9 13v2M15 13v2" /><circle cx="12" cy="4" r="1.2" /></>,
  bug: <><rect x="7" y="7" width="10" height="12" rx="5" /><path d="M12 7V4M9 9L6 6M15 9l3-3M4 13h3M17 13h3M6 18l-2 2M18 18l2 2" /></>,
}

function Icon({ name, size = 22 }: { name: IconKey; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {ICON_PATHS[name]}
    </svg>
  )
}

type Point = { label: string; icon: IconKey }
type Section = { id: string; eyebrow: string; title: string; icon: IconKey; points: Point[]; note?: string }

const SECTIONS: Section[] = [
  {
    id: 'encryption',
    eyebrow: 'Section 01',
    title: 'Data in Transit & At Rest',
    icon: 'lock',
    points: [
      { icon: 'lock', label: 'TLS 1.2+ encryption for all data in transit — website, API, and mobile' },
      { icon: 'database', label: 'AES-256 encryption for data at rest in our Supabase Postgres database' },
      { icon: 'doc', label: 'SSL/TLS certificates managed by Let’s Encrypt, with automatic renewal' },
      { icon: 'check', label: 'All customer data encrypted by default — no opt-in required' },
    ],
  },
  {
    id: 'access',
    eyebrow: 'Section 02',
    title: 'Who Can Access What',
    icon: 'shield',
    points: [
      { icon: 'key', label: 'Email/password authentication with secure password hashing' },
      { icon: 'unlock', label: 'Google OAuth available for easier, passwordless login' },
      { icon: 'device', label: 'Multi-factor authentication (MFA) available for admin accounts' },
      { icon: 'layers', label: 'Role-based access control — Admin, User, and Read-only tiers' },
      { icon: 'building', label: 'Each customer’s data isolated at the database level via row-level security (RLS)' },
      { icon: 'search', label: 'Super admin access to customer data is exceptional, not routine, and always logged to an audit trail' },
    ],
  },
  {
    id: 'monitoring',
    eyebrow: 'Section 03',
    title: 'We Watch What Matters',
    icon: 'eye',
    points: [
      { icon: 'doc', label: 'Comprehensive audit logging — every create, update, and delete records who did what, and when' },
      { icon: 'calendar', label: '90-day audit trail retention, auto-purged on a schedule after that' },
      { icon: 'bolt', label: 'Real-time access logging for admin accounts' },
      { icon: 'dollar', label: 'Cost-conscious, efficient logging — built for a growing business, not enterprise overkill' },
      { icon: 'search', label: 'Super admin actions are logged and visible in each customer’s own audit trail' },
      { icon: 'xcircle', label: 'Logs record actions only — never the content of your customer data' },
    ],
  },
  {
    id: 'incident-response',
    eyebrow: 'Section 04',
    title: 'When Things Go Wrong',
    icon: 'alert',
    points: [
      { icon: 'doc', label: 'A written incident response plan is in place' },
      { icon: 'mail', label: 'Security vulnerabilities can be reported to legal@qcyphertech.com' },
      { icon: 'clock', label: 'Customers notified within 24 hours of a confirmed breach, or as required by law' },
      { icon: 'search', label: 'Every incident gets a post-incident review, with lessons learned documented' },
      { icon: 'xcircle', label: 'No data brokers or third parties are given access to customer data' },
    ],
    note: 'Public disclosure policy: we only publish a public incident report when required by law or explicitly requested by an affected customer — not as a matter of course. Any public report omits customer names and specific technical vulnerabilities.',
  },
  {
    id: 'data-handling',
    eyebrow: 'Section 05',
    title: 'Your Data. Your Control.',
    icon: 'folder',
    points: [
      { icon: 'home', label: 'You own all of your data — contacts, notes, customer records, everything' },
      { icon: 'upload', label: 'Data export available on request, in CSV or JSON' },
      { icon: 'trash', label: 'All data removed within 30 days of account closure' },
      { icon: 'database', label: 'Automatic daily backups, managed by Supabase' },
      { icon: 'box', label: 'Backup retention: 7 days minimum, 30 days standard' },
      { icon: 'xcircle', label: 'We never sell or share your customer data with third parties' },
    ],
    note: 'In compliance terms: we are a "data processor" — you remain the "data controller" of your customer information.',
  },
  {
    id: 'infrastructure',
    eyebrow: 'Section 06',
    title: 'Built on Trusted Services',
    icon: 'building',
    points: [
      { icon: 'database', label: 'Database: Supabase Postgres, AWS-backed and SOC 2 Type II compliant' },
      { icon: 'server', label: 'Hosting: Vercel — edge functions, DDoS protection, 99.95% uptime SLA' },
      { icon: 'link', label: 'Third-party services: Cal.com for scheduling, Telnyx for SMS/voice, Resend for email' },
      { icon: 'check', label: 'Every third-party service is evaluated for security before we integrate it' },
      { icon: 'mail', label: 'No customer data is stored in third-party systems — only operational data like scheduled events or sent emails' },
    ],
  },
  {
    id: 'roadmap',
    eyebrow: 'Section 07',
    title: 'What’s Coming',
    icon: 'map',
    points: [
      { icon: 'chart', label: 'SOC 2 Type II audit planned once our customer base reaches 50+' },
      { icon: 'globe', label: 'ISO 27001 certification as a long-term goal, 18–24 months out' },
      { icon: 'bot', label: 'Automated vulnerability scanning currently in development' },
      { icon: 'shield', label: 'Additional API rate limiting and DDoS hardening' },
      { icon: 'bug', label: 'A bug bounty program, once scale justifies it' },
    ],
  },
  {
    id: 'compliance',
    eyebrow: 'Section 08',
    title: 'Security Documents & Assessments',
    icon: 'folder',
    points: [
      { icon: 'doc', label: 'Security & privacy documentation available on request' },
      { icon: 'doc', label: 'Incident response plan available on request' },
      { icon: 'handshake', label: 'Data Processing Agreement (DPA) available for enterprise customers' },
      { icon: 'doc', label: 'SOC 2 report available upon request — currently undergoing preparation' },
    ],
    note: 'Contact legal@qcyphertech.com for compliance questions.',
  },
]

export default function SecurityPage() {
  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', background: '#f8f9fc', color: '#171a2b', lineHeight: 1.5 }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        a { color: inherit; text-decoration: none; }
        img { max-width: 100%; display: block; }

        :root {
          --ink: #171a2b;
          --soft: #5b6072;
          --bg: #f8f9fc;
          --card: #ffffff;
          --border: rgba(26,48,112,0.10);
          --border2: rgba(26,48,112,0.18);
          --navy: #0B1640;
          --indigo: #1a3070;
          --indigo-d: #2a52a0;
          --steel: #2B5FA8;
          --cyan: #4a9db5;
          --teal: #17C9E8;
          --violet: #8B5CF6;
          --mint: #00a87a;
        }

        .wrap { max-width: 1152px; margin: 0 auto; padding: 0 32px; }

        /* NAV */
        .nav-bar {
          position: sticky; top: 0; z-index: 50;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border);
        }
        .nav-inner {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 32px; max-width: 1152px; margin: 0 auto;
        }
        .nav-logo { display: flex; align-items: center; gap: 2px; font-weight: 800; font-size: 17px; color: var(--indigo); }
        .nav-logo img { height: 44px; width: auto; display: block; }
        .nav-links { display: flex; align-items: center; gap: 24px; }
        .nav-link { font-size: 15px; font-weight: 600; color: var(--soft); transition: color .15s; }
        .nav-link:hover, .nav-link.active { color: var(--indigo); }
        .nav-cta { display: flex; align-items: center; gap: 8px; }

        .btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 7px;
          min-height: 44px; padding: 0 20px;
          border-radius: 10px; font-weight: 700; font-size: 15px;
          cursor: pointer; border: 1px solid transparent;
          transition: transform .15s, opacity .15s; font-family: inherit;
          text-align: center;
        }
        .btn:hover { transform: translateY(-1px); }
        .btn-ghost { background: transparent; color: var(--indigo); border: 1px solid var(--border2); }
        .btn-ghost:hover { border-color: var(--cyan); color: var(--cyan); }
        .btn-sm { min-height: 44px; padding: 0 14px; font-size: 14px; white-space: nowrap; }

        /* HERO */
        .sec-hero {
          padding: 76px 0 60px;
          background: linear-gradient(155deg, #0B1640 0%, #1a3070 45%, #2B5FA8 85%, #17C9E8 130%);
          position: relative;
          overflow: hidden;
        }
        .sec-hero::after {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 60% 60% at 80% 0%, rgba(139,92,246,0.25) 0%, transparent 70%);
          pointer-events: none;
        }
        .sec-hero .wrap { position: relative; text-align: center; }
        .sec-hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.16);
          border-radius: 99px; padding: 6px 16px; margin-bottom: 22px;
          font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.85);
          letter-spacing: 0.04em; text-transform: uppercase;
        }
        .sec-hero h1 {
          font-size: 44px; font-weight: 900; line-height: 1.1; letter-spacing: -0.03em;
          color: #fff; margin-bottom: 14px;
        }
        .sec-hero h2 {
          font-size: 19px; font-weight: 600; color: var(--teal);
          margin-bottom: 20px; letter-spacing: -0.01em;
        }
        .sec-hero p {
          font-size: 16px; color: rgba(255,255,255,0.75); max-width: 620px;
          margin: 0 auto; line-height: 1.7;
        }
        @media (max-width: 600px) {
          .sec-hero { padding: 52px 0 40px; }
          .sec-hero h1 { font-size: 30px; }
          .sec-hero h2 { font-size: 16px; }
        }

        /* SECTIONS */
        .sec-block { padding: 60px 0; border-bottom: 1px solid var(--border); }
        .sec-block:nth-child(odd) { background: #fff; }
        .sec-head { display: flex; align-items: center; gap: 18px; margin-bottom: 30px; }
        .sec-icon {
          flex-shrink: 0; width: 52px; height: 52px; border-radius: 15px;
          display: flex; align-items: center; justify-content: center;
          color: var(--steel);
          background: linear-gradient(135deg, rgba(43,95,168,0.10), rgba(23,201,232,0.10));
          border: 1px solid var(--border2);
          box-shadow: 0 1px 2px rgba(11,22,64,0.03), inset 0 1px 0 rgba(255,255,255,0.6);
        }
        .sec-eyebrow { font-size: 12px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--steel); margin-bottom: 4px; display: block; }
        .sec-head h3 { font-size: 24px; font-weight: 800; color: var(--ink); letter-spacing: -0.025em; }

        .point-list { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 24px; padding-left: 70px; }
        @media (max-width: 720px) { .point-list { grid-template-columns: 1fr; padding-left: 0; } }
        .point {
          display: flex; align-items: flex-start; gap: 10px;
          font-size: 16px; color: var(--soft); line-height: 1.55;
          padding: 6px 8px; margin: -6px -8px; border-radius: 10px;
          transition: background .15s;
        }
        .point:hover { background: rgba(43,95,168,0.045); }
        .point .pt-icon { flex-shrink: 0; line-height: 1.5; color: var(--cyan); margin-top: 1px; }
        .sec-note {
          margin-top: 22px; margin-left: 70px; padding: 14px 18px;
          background: rgba(43,95,168,0.06); border-left: 3px solid var(--steel);
          border-radius: 8px; font-size: 15px; color: var(--soft); max-width: 640px;
        }
        @media (max-width: 720px) { .sec-note { margin-left: 0; } }

        /* HONESTY CALLOUT — same left-accent treatment as .sec-note above it */
        .honesty-box {
          margin-top: 22px; margin-left: 70px; padding: 20px 22px;
          background: linear-gradient(135deg, rgba(139,92,246,0.06), rgba(23,201,232,0.06));
          border-left: 3px solid var(--violet);
          border-radius: 8px;
        }
        @media (max-width: 720px) { .honesty-box { margin-left: 0; } }
        .honesty-box p { font-size: 16px; color: var(--soft); line-height: 1.7; margin-bottom: 10px; }
        .honesty-box p:last-child { margin-bottom: 0; }
        .honesty-box strong { color: var(--ink); }

        /* CONTACT CTA */
        .contact-cta { padding: 64px 0 56px; background: #fff; }
        .contact-cta-card {
          position: relative;
          max-width: 620px; margin: 0 auto;
          text-align: center;
          background: var(--card);
          border: 1px solid var(--border2);
          border-radius: 24px;
          padding: 48px 40px 36px;
          box-shadow: 0 1px 2px rgba(11,22,64,0.04), 0 20px 48px -20px rgba(43,95,168,0.18);
          overflow: hidden;
        }
        .contact-cta-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, var(--steel), var(--teal), var(--violet));
        }
        .contact-cta-icon {
          width: 52px; height: 52px; margin: 0 auto 18px;
          border-radius: 16px; color: var(--steel);
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, rgba(43,95,168,0.12), rgba(23,201,232,0.12));
          border: 1px solid var(--border2);
        }
        .contact-cta h2 { font-size: 28px; font-weight: 900; color: var(--ink); margin-bottom: 10px; letter-spacing: -0.02em; }
        .contact-cta p { font-size: 16px; color: var(--soft); max-width: 420px; margin: 0 auto 26px; line-height: 1.65; }
        .contact-cta-links { display: flex; align-items: center; justify-content: center; gap: 20px; flex-wrap: wrap; margin-bottom: 14px; }
        .contact-cta-links a {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 16px; font-weight: 700; color: #fff;
          background: linear-gradient(135deg, var(--indigo-d), var(--cyan));
          padding: 13px 26px; border-radius: 12px;
          box-shadow: 0 6px 20px rgba(74,157,181,0.28);
          transition: transform .15s, box-shadow .15s;
        }
        .contact-cta-links a:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(74,157,181,0.36); }
        .contact-cta-meta { font-size: 13px; color: var(--soft); opacity: 0.8; }
        .contact-cta-docs {
          display: flex; align-items: center; justify-content: center; gap: 18px; flex-wrap: wrap;
          margin-top: 26px; padding-top: 22px; border-top: 1px solid var(--border);
        }
        .contact-cta-docs a { font-size: 14px; font-weight: 600; color: var(--steel); }
        .contact-cta-docs a:hover { color: var(--cyan); text-decoration: underline; }
        .contact-cta-updated { font-size: 12px; color: var(--soft); opacity: 0.65; margin-top: 14px; }

        /* FOOTER — matches homepage/about */
        footer {
          position: relative;
          padding: 22px 0 12px;
          background: linear-gradient(145deg, #0e1f45 0%, #1a3070 45%, #1e4a7a 75%, #246080 100%);
          overflow: hidden;
        }
        footer::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, var(--cyan), var(--mint), transparent);
          opacity: 0.7;
        }
        footer::after {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 50% 60% at 85% 0%, rgba(74,157,181,0.12) 0%, transparent 70%);
          pointer-events: none;
        }
        footer .wrap { position: relative; }
        footer .nav-logo { color: #fff; }
        .foot-grid { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 20px; margin-bottom: 12px; }
        @media (max-width: 680px) { .foot-grid { grid-template-columns: 1fr; gap: 14px; } }
        .foot-brand p { font-size: 13px; color: rgba(255,255,255,0.55); max-width: 260px; margin-top: 4px; line-height: 1.45; }
        .foot-col h5 {
          font-size: 11px; text-transform: uppercase; letter-spacing: .12em;
          color: rgba(255,255,255,0.4); margin-bottom: 6px; font-weight: 700;
        }
        .foot-col a {
          display: flex; align-items: center; gap: 6px;
          font-size: 13px; color: rgba(255,255,255,0.75); margin-bottom: 3px; font-weight: 500;
          transition: color .15s, transform .15s; width: fit-content;
        }
        .foot-col a:hover { color: #fff; transform: translateX(3px); }
        .foot-col a::after {
          content: '→'; opacity: 0; transform: translateX(-4px);
          transition: opacity .15s, transform .15s; font-size: 11px; color: var(--cyan);
        }
        .foot-col a:hover::after { opacity: 1; transform: translateX(0); }
        .foot-bottom {
          border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;
          display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px;
          font-size: 13px; color: rgba(255,255,255,0.4);
        }

        /* INTEGRATIONS FOOTER */
        .integrations-section { padding: 0.85rem 0; margin-bottom: 10px; border-top: 1px solid rgba(255,255,255,0.08); border-bottom: 1px solid rgba(255,255,255,0.08); }
        .integrations-headline { text-align: center; font-size: 12px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: rgba(255,255,255,0.4); margin-bottom: 14px; }
        .integrations-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
        .integration-card {
          width: 60px; height: 30px; border-radius: 8px;
          background: rgba(255,255,255,0.92); display: flex; align-items: center; justify-content: center;
          padding: 6px; flex: 0 0 auto; transition: background .15s, transform .15s;
        }
        .integration-card:hover { background: #fff; transform: translateY(-2px); }
        .integration-card img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }

        @media (max-width: 480px) {
          .nav-inner { padding: 10px 16px; }
          .nav-logo img { height: 32px; }
          .btn-sm { font-size: 13px; padding: 0 12px; }
          .nav-links { display: none; }
          .nav-page-link { font-size: 13px !important; margin-right: 2px !important; }
        }
      `}</style>

      {/* NAV */}
      <header className="nav-bar">
        <div className="nav-inner">
          <Link href="/" className="nav-logo">
            <img src="/qcypher-logo-horizontal.png" alt="QCypher Technologies" />
          </Link>
          <nav className="nav-links">
            <Link href="/" className="nav-link">Home</Link>
            <Link href="/about" className="nav-link">About</Link>
            <Link href="/security" className="nav-link active">Security</Link>
          </nav>
          <div className="nav-cta">
            <Link href="/auth/login" className="btn btn-ghost btn-sm">Sign in</Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <div className="sec-hero">
        <div className="wrap">
          <span className="sec-hero-badge"><Icon name="lock" size={14} /> Security</span>
          <h1>Security by Design</h1>
          <h2>Your data. Protected. Transparent.</h2>
          <p>
            We take security seriously. QCypher is built on a foundation of encryption, role-based access control,
            and continuous monitoring. Here&apos;s exactly how we protect your business data — no corporate jargon,
            just the facts.
          </p>
        </div>
      </div>

      {/* CONTENT SECTIONS */}
      {SECTIONS.map(section => (
        <section key={section.id} id={section.id} className="sec-block">
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-icon"><Icon name={section.icon} /></div>
              <div>
                <span className="sec-eyebrow">{section.eyebrow}</span>
                <h3>{section.title}</h3>
              </div>
            </div>
            <div className="point-list">
              {section.points.map((p, i) => (
                <div className="point" key={i}>
                  <span className="pt-icon"><Icon name={p.icon} size={17} /></span>
                  <span>{p.label}</span>
                </div>
              ))}
            </div>
            {section.note && <div className="sec-note">{section.note}</div>}
          </div>
        </section>
      ))}

      {/* HONESTY / TRANSPARENCY */}
      <section className="sec-block">
        <div className="wrap">
          <div className="sec-head">
            <div className="sec-icon"><Icon name="handshake" /></div>
            <div>
              <span className="sec-eyebrow">A Note on Honesty</span>
              <h3>Transparency Over Perfection</h3>
            </div>
          </div>
          <div className="honesty-box">
            <p>We&apos;re a small team, not a 500-person security department — and we&apos;d rather tell you that than pretend otherwise.</p>
            <p>What we can tell you is that <strong>our architecture is designed for enterprise-grade security</strong> from day one: encryption everywhere, strict tenant isolation, and an audit trail for every action that matters.</p>
            <p>And when something does go wrong, you get a real incident response process — not just a promise that &quot;we handle everything.&quot;</p>
          </div>
        </div>
      </section>

      {/* CONTACT CTA */}
      <div className="contact-cta">
        <div className="wrap">
          <div className="contact-cta-card">
            <div className="contact-cta-icon"><Icon name="chat" /></div>
            <h2>Questions?</h2>
            <p>We believe in transparency. If you have questions about our security practices, please reach out.</p>
            <div className="contact-cta-links">
              <a href="mailto:legal@qcyphertech.com"><Icon name="mail" size={17} /> legal@qcyphertech.com</a>
            </div>
            <p className="contact-cta-meta">Response time: within 48 business hours</p>
            <div className="contact-cta-docs">
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/terms">Terms of Service</Link>
              <Link href="/faq">FAQs</Link>
            </div>
            <p className="contact-cta-updated">Last updated: August 7, 2026</p>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer>
        <div className="wrap">
          <div className="foot-grid">
            <div className="foot-brand">
              <div className="nav-logo" style={{ marginBottom: 0 }}>
                <img src="/qcypher-logo-footer.png" alt="QCypher Technologies" />
              </div>
              <p>Simple tech solutions for local businesses. No jargon, just results.</p>
            </div>
            <div className="foot-col">
              <h5>Contact Us</h5>
              <a href="mailto:info@qcyphertech.com">info@qcyphertech.com</a>
              <a href="tel:+18042505066" style={{ fontWeight: 600, color: 'var(--cyan)', marginBottom: '4px' }}>(804) 250-5066</a>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', margin: '0' }}>Ask for Felix or Thomas.</p>
            </div>
            <div className="foot-col">
              <h5>Quick Links</h5>
              <Link href="/about">About</Link>
              <Link href="/security">Security</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/faq">FAQs</Link>
              <Link href="/auth/login">Client Login</Link>
            </div>
          </div>

          <div className="integrations-section" role="region" aria-label="Integration partners">
            <div className="integrations-headline">Built to work together — no tech headaches</div>
            <div className="integrations-grid">
              {INTEGRATION_LOGOS.map((logo) => (
                <div className="integration-card" key={logo.file}>
                  <img src={logo.file} alt={logo.name} loading="lazy" />
                </div>
              ))}
            </div>
          </div>

          <div className="foot-bottom">
            <span>© 2026 QCypher Technologies. All rights reserved.</span>
            <span>Built for small businesses, by a small business.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
