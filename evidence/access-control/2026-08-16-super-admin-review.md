# Super-Admin Access Review — 2026-08-16

Run via `python3 scripts/review-super-admins.py`. First run of this
process — establishes the baseline for the monthly cadence.

## Accounts reviewed

| Account | Created | Last sign-in | MFA |
|---|---|---|---|
| `qcyphertech@gmail.com` | 2026-07-18 | 2026-08-16 | ✅ 1 verified device |
| `nevis09@gmail.com` | 2026-07-14 | 2026-08-16 | ✅ 1 verified device |

## Findings

- Both super-admin accounts have verified TOTP MFA enrolled. Neither has
  a friendly device name set (both enrolled before the friendly-naming
  fix shipped same day — see `MfaSetupForm.tsx` commit history); cosmetic
  only, not a finding requiring action.
- Both accounts are actively used (same-day sign-in for this review).
- Both accounts are appropriate for super-admin access — 2-person team,
  both are the actual founders/operators of QCypher.

## Outcome

No action required. List is correct as of this review.

## Next review

**Monthly** (not quarterly — see `docs/staff-training.md` review cadence
note, corrected to match this specific requirement). Next due:
**2026-09-16**.
