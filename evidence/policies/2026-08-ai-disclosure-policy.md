# QCypher AI Disclosure Policy

**Last Updated:** August 2026 (citations independently verified and corrected August 18, 2026 — see `evidence/ai-disclosure/2026-08-18-legal-citation-verification.md`)
**Review Cadence:** Quarterly (SOC 2 evidence requirement)
**Compliance Basis:** FTC's proposed July 2026 AI accuracy/disclosure policy statement (not yet finalized), EU AI Act Article 50, California AI Transparency Act (SB 942 as amended by AB 853)

---

## 1. Overview

QCypher Technologies ("QCypher") uses AI systems (specifically DeepSeek V4 Flash) in specific product features. This policy discloses:
- Where AI is used in QCypher products
- How AI systems are deployed
- Data handling and privacy
- User control and transparency
- Compliance framework

**This policy applies to:**
- QCypher tenant customers (Growth and All-In packages only)
- QCypher.com marketing website
- QCypher CRM internal product

---

## 2. AI Features & Disclosure

### 2.1 Phase 36: AI Blog Generation
**What:** Automated blog post generation for tenant websites
**Technology:** DeepSeek V4 Flash (LLM)
**User Control:** Tenants choose to publish or skip each blog
**Data Usage:** Blog content NOT used for model training; input deleted after generation
**Disclosure:**
- Meta tag: `<meta name="ai-assisted" content="true">` on all AI blogs
- Visible badge: "⚡ AI-Assisted" (tenant can disable, but not recommended; defaults ON)
- Applies to: Growth ($99/mo) and All-In ($149/mo) packages

**Compliance:** Satisfies EU AI Act Article 50 machine-readable marking requirement

### 2.2 Phase 37: AI Website Chatbot
**What:** 24/7 chatbot answering customer questions, booking appointments
**Technology:** DeepSeek V4 Flash (LLM)
**Data Usage:** Conversation history NOT retained; each session ephemeral
**User Control:** Visitors can close chat anytime; no personal data required to chat
**Disclosure:**
- Label: **"Powered by AI"** visible above chat input (always present)
- Applies to: Growth and All-In tenant websites + QCypher.com

**Compliance:** Designed to align with the FTC's proposed (not yet finalized) July 2026 standard for clear, visible disclosure before AI interaction — see §4.1. QCypher's label is "Powered by AI," shown above the chat input.

### 2.3 Phase 37b: AI CRM In-App Assistant
**What:** Sidebar AI assistant helping tenants with "how do I...?" questions
**Technology:** DeepSeek V4 Flash (LLM)
**Data Usage:** Conversation history NOT retained; input not used for training
**User Control:** Tenant can close sidebar anytime; optional feature
**Disclosure:**
- Indicator: **"AI-Assisted"** label in sidebar header (always visible when open)
- Applies to: Growth and All-In packages

### 2.4 Phase 32: Smart Upsell Suggestions
**What:** Rule-based system recommending add-on services at checkout
**Technology:** Decision rules (NOT AI/LLM; deterministic)
**Data Usage:** No personal data used; only service type + checkout context
**Disclosure:** NOT marked as AI because it's rule-based, not AI-generated
**Applies to:** All-In ($149/mo) package

### 2.5 Phase 34: Vulnerability Scanning
**What:** Automated weekly security scans (OWASP ZAP)
**Technology:** NOT AI; deterministic security tool
**Disclosure:** NOT marked as AI
**Applies to:** All-In package

---

## 3. Data Handling & Privacy

### 3.1 No Training on Customer Data
- Customer data (blog content, CRM data, conversations) is **NOT used** to train DeepSeek or any other model
- DeepSeek system prompt is cached; no customer data persists in cache
- Each request is stateless

### 3.2 Data Retention
- Blog generation: Output stored in database; input (service description) deleted after generation
- Chatbot: Conversation history NOT stored; each session ephemeral
- Detection tool: Analysis results NOT stored (admin use only)
- Audit logs: QCypher tracks all AI feature usage (Phase 22 audit trail) for compliance

### 3.3 Vendor: DeepSeek
- DeepSeek V4 Flash is a third-party LLM provider
- DeepSeek does not use inputs for model training (default setting)
- API calls encrypted in transit (HTTPS)
- No personal data sent to DeepSeek (only service descriptions, blog content)

---

## 4. Compliance & Legal Basis

### 4.1 FTC Requirements (US)
⚠️ **Status:** The FTC issued a *proposed* policy statement on AI accuracy and output steering on July 1, 2026 (public comment period ran through July 31, 2026) — using "clear, conspicuous, and made before or at the point of interaction" language. As of this writing it has not been finalized/adopted. QCypher's disclosure practices below are designed to align with this proposed standard as a matter of good practice, not because it is yet a binding legal requirement.

✅ **Clear and Conspicuous Disclosure**
- Badges placed at point of interaction (blog, chat, CRM)
- Not buried in Terms of Service
- Visible before user engages with AI feature

✅ **No Deception**
- QCypher does not claim AI capability it doesn't have
- QCypher does not hide AI involvement
- Disclosure applies to ALL AI content, not selective

✅ **Machine-Readable Format**
- Meta tags on blogs: `<meta name="ai-assisted" content="true">`
- Audit logs record each AI feature interaction

### 4.2 EU AI Act Article 50 (Effective August 2, 2026)
✅ **Machine-Readable Marking**
- Meta tag on AI-generated blogs
- Audit logs in machine-readable format (JSON)

✅ **Visible Disclosure for High-Risk Content**
- Blog badge: "⚡ AI-Assisted" (visible, not deceptive)
- Chatbot label: "Powered by AI" (not misleading)

### 4.3 California SB 942 / AI Transparency Act (Effective August 2, 2026)
⚠️ **Scope note:** SB 942 (as amended by AB 853, which moved its effective date from January 1, 2026 to August 2, 2026 to align with the EU AI Act) applies to covered providers with over 1,000,000 monthly California users, and requires a free public AI-content-detection tool plus manifest/latent disclosure for AI-generated **image, video, and audio** content specifically — it is not primarily a text-labeling law. QCypher is well under the 1,000,000-MAU threshold and is not a "covered provider" under this law's own scope. QCypher labels its AI-generated blog text anyway, as a voluntary practice consistent with the spirit of AI-content transparency laws generally, not because SB 942 itself requires text labeling or currently applies to QCypher's scale.
- QCypher labels all AI-generated blog posts (voluntary, exceeds what SB 942 requires at QCypher's current scale)
- Applies to tenant sites in California + QCypher.com

---

## 5. User Control & Transparency

### 5.1 Tenant Control (Phase 36 Blogs)
- Tenant can enable/disable visible badge per blog: `disclose_ai_assistance` toggle
- Default: ON (recommended for compliance)
- Tenant cannot hide machine-readable meta tag (always present)

### 5.2 Visitor Control (Phase 37 Chatbot)
- Visitors can close chat anytime
- No login required to use chat
- No personal data required before engagement

### 5.3 Tenant Control (Phase 37b CRM Bot)
- Tenant can toggle sidebar off
- Feature is optional (not forced)

### 5.4 Audit Trail (Phase 22)
- Every AI feature invocation logged in `audit_logs` table
- Logged by: feature, user, timestamp, tenant
- Retained: 90 days minimum (per Phase 25 retention policy)
- Purpose: Compliance verification + incident response

---

## 6. Annual Attestation & Audit Schedule

**Quarterly Review (Requirement):**
- August 2026, November 2026, February 2027, May 2027, ...
- Review: Do disclosed AI features match actual code?
- Review: Are badges still visible in all UIs?
- Review: Are new AI features disclosed?
- Update evidence repository with review notes

**Annual SOC 2 Type II Audit:**
- Auditor verifies: Policy vs implementation match
- Auditor checks: Audit logs capture AI usage
- Auditor validates: Disclosure appears at point of interaction
- Evidence stored: `evidence/ai-disclosure/[date]-disclosure-audit.md`

---

## 7. Enforcement & Penalty Risk

**FTC Penalty (2026):** $53,088 per violation is the current, verified maximum civil penalty under FTC Act §§5(l)/5(m)(1) for knowing violations of an FTC rule, final order, or unfair-or-deceptive-practices determination. This is a general Section 5 civil-penalty ceiling — it is not a figure specific to AI disclosure, and it only applies once the FTC has actually made a rule or issued an order/determination QCypher could knowingly violate (the July 2026 proposed statement, per §4.1, is not yet such a rule). Kept here as a reference point for the scale of exposure if the proposed standard is later finalized and enforced, not as an active, currently-applicable penalty.
- Illustrative only: 100 AI blogs without disclosure × $53,088 = $5.3M potential exposure if a future final rule were violated
- Mitigation: Consistent, verifiable disclosure + audit trail

**EU Penalty:** Up to €15M or 3% of global annual turnover (whichever is higher) for Article 50 transparency violations — verified against the AI Act's Article 99 penalty tiers. This one is real and currently applicable given Article 50's August 2, 2026 effective date.

**Mitigation Strategy:**
1. Disclose every AI-generated piece of content (no exceptions)
2. Audit trail proves disclosure at point of interaction
3. Quarterly review ensures policy-implementation alignment
4. Documentation for regulators (if enforcement ever occurs)

---

## 8. Policy Effective Date & Approval

**Effective:** August 2026
**Approved by:** Thomas Ocloo (CTO), Felix Sam (CEO)
**Next Review:** November 2026

---

## Questions? Compliance Concerns?

Contact: legal@qcyphertech.com
Escalation: Thomas Ocloo (thomas@qcyphertech.com)
