'use client'

import { useState, useTransition } from 'react'
import { UserPlus, X, Clock, Crown, User, Eye, ChevronDown, MapPin } from 'lucide-react'
import type { TeamMember, PendingInvite, Role } from '@/lib/actions/team'
import { revokeInvite, updateMemberRole, removeMember } from '@/lib/actions/team'
import { setStaffLocationAssignment, removeStaffLocationAssignment, type StaffLocationAssignment } from '@/lib/actions/staff-locations'

type LocationOption = { id: string; location_name: string }

type Props = {
  members: TeamMember[]
  pending: PendingInvite[]
  currentUserId: string
  // When set, this panel is being used from the super-admin tenant detail
  // page to manage a specific client's team rather than the caller's own —
  // actions are scoped to this tenant and the "invite" form (which only
  // makes sense for a tenant's own owner) is hidden.
  tenantId?: string
  // Only present when the tenant has adopted multi-location (Phase 33b) —
  // when empty/omitted, the per-member "Locations" control stays hidden so
  // the panel looks unchanged for tenants that haven't opted in.
  locations?: LocationOption[]
  staffAssignments?: StaffLocationAssignment[]
}

function LocationAssignRow({ member, locations, assignments, tenantId, onChange }: {
  member: TeamMember
  locations: LocationOption[]
  assignments: StaffLocationAssignment[]
  tenantId?: string
  onChange: (next: StaffLocationAssignment[]) => void
}) {
  const [pending, startTransition] = useTransition()
  const assignedIds = new Set(assignments.map(a => a.location_id))

  function toggle(locationId: string, checked: boolean) {
    startTransition(async () => {
      if (checked) {
        const result = await setStaffLocationAssignment({ userId: member.id, locationId, tenantId })
        if (result.ok) onChange([...assignments, { id: `${member.id}-${locationId}`, user_id: member.id, location_id: locationId, role: 'technician', is_primary_location: true, can_schedule_cross_location: false, location_name: locations.find(l => l.id === locationId)?.location_name ?? '' }])
      } else {
        const result = await removeStaffLocationAssignment(member.id, locationId, tenantId)
        if (result.ok) onChange(assignments.filter(a => a.location_id !== locationId))
      }
    })
  }

  return (
    <div style={{ padding: '10px 16px 12px 52px', borderTop: '1px solid hsl(var(--border))', background: 'hsl(var(--muted))' }}>
      <p style={{ fontSize: '12px', fontWeight: 700, color: 'hsl(var(--muted-foreground))', marginBottom: '6px' }}>Assigned locations</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {locations.map(loc => (
          <label key={loc.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'hsl(var(--foreground))', cursor: pending ? 'default' : 'pointer' }}>
            <input
              type="checkbox"
              disabled={pending}
              checked={assignedIds.has(loc.id)}
              onChange={e => toggle(loc.id, e.target.checked)}
            />
            {loc.location_name}
          </label>
        ))}
      </div>
    </div>
  )
}

const ROLE_LABEL: Record<Role, string> = { owner: 'Admin', member: 'User', read_only: 'Read-only' }
const ROLE_ICON: Record<Role, typeof Crown> = { owner: Crown, member: User, read_only: Eye }
const ROLE_COLOR: Record<Role, string> = { owner: '#2a52a0', member: 'hsl(var(--muted-foreground))', read_only: '#a16207' }

function Avatar({ email, role }: { email: string; role: Role }) {
  const initials = email.split('@')[0].slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: '40px', height: '40px', borderRadius: '14px', flexShrink: 0,
      background: role === 'owner'
        ? 'linear-gradient(135deg,#2a52a0,#4a9db5)'
        : 'hsl(var(--muted))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: '13px', fontWeight: 700, color: role === 'owner' ? '#fff' : 'hsl(var(--muted-foreground))' }}>
        {initials}
      </span>
    </div>
  )
}

function RoleBadge({ role }: { role: Role }) {
  const Icon = ROLE_ICON[role]
  const color = ROLE_COLOR[role]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 8px', borderRadius: '99px', fontSize: '12px', fontWeight: 600,
      background: role === 'owner' ? 'rgba(42,82,160,0.10)' : role === 'read_only' ? 'rgba(161,98,7,0.10)' : 'hsl(var(--muted))',
      color,
    }}>
      <Icon style={{ width: '10px', height: '10px' }} />
      {ROLE_LABEL[role]}
    </span>
  )
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function TeamPanel({ members: initialMembers, pending: initialPending, currentUserId, tenantId, locations = [], staffAssignments: initialAssignments = [] }: Props) {
  const [members, setMembers] = useState(initialMembers)
  const [pending, setPending] = useState(initialPending)
  const [assignments, setAssignments] = useState(initialAssignments)
  const [expandedLocationsFor, setExpandedLocationsFor] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('member')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const res = await fetch('/api/team/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), role }),
    })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Something went wrong')
      return
    }

    setSuccess(`Invite sent to ${email.trim()}`)
    setEmail('')
    setRole('member')
    setShowInvite(false)

    // Optimistically add to pending list
    setPending(prev => [{
      id: json.token,
      email: email.trim().toLowerCase(),
      role,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
    }, ...prev])
  }

  function handleRevoke(id: string) {
    startTransition(async () => {
      await revokeInvite(id, tenantId)
      setPending(prev => prev.filter(p => p.id !== id))
    })
  }

  function handleRoleChange(memberId: string, newRole: Role) {
    startTransition(async () => {
      await updateMemberRole(memberId, newRole, tenantId)
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m))
    })
  }

  function handleRemove(memberId: string) {
    startTransition(async () => {
      await removeMember(memberId, tenantId)
      setMembers(prev => prev.filter(m => m.id !== memberId))
    })
  }

  const card: React.CSSProperties = {
    borderRadius: '16px',
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    overflow: 'hidden',
  }

  return (
    <div>
      {/* Members list */}
      <div style={card}>
        {members.map((m, i) => (
          <div key={m.id}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 16px',
              borderBottom: i < members.length - 1 && expandedLocationsFor !== m.id ? '1px solid hsl(var(--border))' : undefined,
            }}>
              <Avatar email={m.email} role={m.role} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'hsl(var(--foreground))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.email}
                </p>
                <p style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))', marginTop: '1px' }}>
                  Joined {fmt(m.joined_at)}{m.last_seen ? ` · Last seen ${fmt(m.last_seen)}` : ''}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {locations.length > 0 && (
                  <button
                    onClick={() => setExpandedLocationsFor(prev => prev === m.id ? null : m.id)}
                    title="Assign locations"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '3px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                      border: '1px solid hsl(var(--border))',
                      background: expandedLocationsFor === m.id ? 'hsl(var(--muted))' : 'transparent',
                      color: 'hsl(var(--muted-foreground))', cursor: 'pointer',
                    }}
                  >
                    <MapPin style={{ width: '12px', height: '12px' }} />
                    {assignments.filter(a => a.user_id === m.id).length || ''}
                  </button>
                )}
                {m.id === currentUserId ? (
                  <RoleBadge role={m.role} />
                ) : (
                  <>
                    {/* Role selector for non-self members */}
                    <div style={{ position: 'relative' }}>
                      <select
                        value={m.role}
                        disabled={isPending}
                        onChange={e => handleRoleChange(m.id, e.target.value as Role)}
                        style={{
                          appearance: 'none', WebkitAppearance: 'none',
                          padding: '3px 24px 3px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                          border: '1px solid hsl(var(--border))',
                          background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="owner">Admin</option>
                        <option value="member">User</option>
                        <option value="read_only">Read-only</option>
                      </select>
                      <ChevronDown style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', width: '12px', height: '12px', pointerEvents: 'none', color: 'hsl(var(--muted-foreground))' }} />
                    </div>
                    <button
                      onClick={() => handleRemove(m.id)}
                      disabled={isPending}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
                    >
                      <X style={{ width: '14px', height: '14px', color: 'hsl(var(--muted-foreground))' }} />
                    </button>
                  </>
                )}
              </div>
            </div>
            {expandedLocationsFor === m.id && (
              <LocationAssignRow
                member={m}
                locations={locations}
                assignments={assignments.filter(a => a.user_id === m.id)}
                tenantId={tenantId}
                onChange={next => setAssignments(prev => [...prev.filter(a => a.user_id !== m.id), ...next])}
              />
            )}
          </div>
        ))}

        {/* Pending invites */}
        {pending.map(p => (
          <div key={p.id} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '12px 16px',
            borderTop: '1px solid hsl(var(--border))',
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '14px', flexShrink: 0,
              background: 'hsl(var(--muted))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Clock style={{ width: '16px', height: '16px', color: 'hsl(var(--muted-foreground))' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'hsl(var(--foreground))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.email}
              </p>
              <p style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))', marginTop: '1px' }}>
                Invite pending · expires {fmt(p.expires_at)}
              </p>
            </div>
            <RoleBadge role={p.role} />
            <span style={{
              padding: '2px 8px', borderRadius: '99px', fontSize: '12px', fontWeight: 600,
              background: 'rgba(234,179,8,0.10)', color: '#a16207',
            }}>
              Pending
            </span>
            <button
              onClick={() => handleRevoke(p.id)}
              disabled={isPending}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex' }}
            >
              <X style={{ width: '14px', height: '14px', color: 'hsl(var(--muted-foreground))' }} />
            </button>
          </div>
        ))}

        {/* Invite button row — only for a tenant's own owner, not the admin-console view */}
        {!tenantId && (
        <div style={{ borderTop: members.length > 0 || pending.length > 0 ? '1px solid hsl(var(--border))' : undefined }}>
          {!showInvite ? (
            <button
              onClick={() => { setShowInvite(true); setSuccess(null) }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer',
                color: '#2a52a0', fontSize: '14px', fontWeight: 600,
              }}
            >
              <UserPlus style={{ width: '16px', height: '16px' }} />
              Invite team member
            </button>
          ) : (
            <form onSubmit={handleInvite} style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'hsl(var(--foreground))' }}>Send invite</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="email"
                  placeholder="colleague@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: '10px', fontSize: '14px',
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))',
                    outline: 'none',
                  }}
                />
                <div style={{ position: 'relative' }}>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as Role)}
                    style={{
                      appearance: 'none', WebkitAppearance: 'none',
                      padding: '8px 28px 8px 10px', borderRadius: '10px', fontSize: '14px', fontWeight: 500,
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="member">User</option>
                    <option value="owner">Admin</option>
                    <option value="read_only">Read-only</option>
                  </select>
                  <ChevronDown style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', width: '13px', height: '13px', pointerEvents: 'none', color: 'hsl(var(--muted-foreground))' }} />
                </div>
              </div>
              {error && <p style={{ fontSize: '13px', color: 'hsl(var(--destructive))' }}>{error}</p>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="submit"
                  disabled={isPending || !email.trim()}
                  style={{
                    padding: '8px 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                    background: 'linear-gradient(135deg,#2a52a0,#4a9db5)', color: '#fff', border: 'none',
                    cursor: 'pointer', opacity: isPending || !email.trim() ? 0.6 : 1,
                  }}
                >
                  {isPending ? 'Sending…' : 'Send invite'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowInvite(false); setEmail(''); setError(null) }}
                  style={{
                    padding: '8px 14px', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
                    background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', border: 'none', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
        )}
      </div>

      {success && (
        <p style={{ fontSize: '13px', color: '#16a34a', marginTop: '8px', paddingLeft: '4px' }}>
          ✓ {success}
        </p>
      )}
    </div>
  )
}
