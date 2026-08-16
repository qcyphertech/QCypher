#!/usr/bin/env python3
"""
QCypher CRM — Evidence Collection Gap Check

The 6-month SOC 2 evidence window (started 2026-08-16, see
evidence/README.md) is only worth anything if collection actually stays
gapless — a manual "remember to add evidence every month" step is
exactly the kind of control this project has repeatedly found silently
unused when nobody was actually checking (see docs/risk-register.md's
closed findings on the nightly backup workflow and deployment logging).
This script is the check: it compares each evidence/ category's most
recent dated file against its documented cadence
(evidence/README.md's table) and flags anything overdue.

Usage: python3 scripts/check-evidence-gaps.py
Exit code 0 if nothing is overdue, 1 if something is.
"""
import re
import sys
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EVIDENCE_DIR = ROOT / "evidence"

# (folder, cadence_days, grace_days) — grace gives a little slack before
# flagging, so a review done a few days late doesn't trip a false alarm.
MONTHLY = 31 + 7  # cadence + grace
CATEGORIES = {
    "access-control": MONTHLY,
    "change-management": MONTHLY,
    "monitoring": MONTHLY,
    "availability": MONTHLY,
    # risk-assessment is quarterly and hasn't had its first review yet —
    # handled separately below using risk-register.md's explicit date
    # rather than a rolling cadence from folder creation.
}

RISK_ASSESSMENT_NEXT_REVIEW = date(2026, 11, 16)

DATE_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})")


def latest_date_in(folder: Path) -> date | None:
    if not folder.is_dir():
        return None
    dates = []
    for f in folder.iterdir():
        if f.name == "README.md":
            continue
        m = DATE_RE.match(f.name)
        if m:
            try:
                dates.append(date.fromisoformat(m.group(1)))
            except ValueError:
                pass
    return max(dates) if dates else None


def main():
    today = date.today()
    flags = []
    report = []

    for category, cadence_with_grace in CATEGORIES.items():
        folder = EVIDENCE_DIR / category
        latest = latest_date_in(folder)
        if latest is None:
            flags.append(f"{category}/: no dated evidence files found at all")
            report.append(f"  {category:20s} NO EVIDENCE")
            continue
        age = (today - latest).days
        overdue = age > cadence_with_grace
        status = "OVERDUE" if overdue else "ok"
        report.append(f"  {category:20s} last: {latest}  ({age}d ago)  {status}")
        if overdue:
            flags.append(
                f"{category}/: last evidence {latest} ({age} days ago), "
                f"expected within ~{cadence_with_grace} days"
            )

    # risk-assessment: quarterly, first review not due until the date
    # in docs/risk-register.md — don't flag an empty folder before then.
    ra_folder = EVIDENCE_DIR / "risk-assessment"
    ra_latest = latest_date_in(ra_folder)
    if ra_latest is None:
        if today > RISK_ASSESSMENT_NEXT_REVIEW:
            flags.append(
                f"risk-assessment/: no evidence yet, and the scheduled "
                f"review date ({RISK_ASSESSMENT_NEXT_REVIEW}) has passed"
            )
            report.append(f"  {'risk-assessment':20s} NO EVIDENCE, PAST DUE DATE")
        else:
            report.append(
                f"  {'risk-assessment':20s} not due yet "
                f"(first review: {RISK_ASSESSMENT_NEXT_REVIEW})"
            )
    else:
        # Once it has a first entry, treat quarterly (90+14 day grace) as
        # the ongoing cadence.
        age = (today - ra_latest).days
        overdue = age > 104
        status = "OVERDUE" if overdue else "ok"
        report.append(f"  {'risk-assessment':20s} last: {ra_latest}  ({age}d ago)  {status}")
        if overdue:
            flags.append(
                f"risk-assessment/: last evidence {ra_latest} ({age} days ago), "
                f"expected within ~104 days (quarterly)"
            )

    print(f"=== Evidence Collection Gap Check — {today} ===\n")
    print("\n".join(report))
    print()

    if flags:
        print("FLAGS:")
        for f in flags:
            print(f"  - {f}")
        sys.exit(1)
    else:
        print("No gaps found.")
        sys.exit(0)


if __name__ == "__main__":
    main()
