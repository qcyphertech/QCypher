// Fixed clinical template field schemas — Phase 43. Deliberately not
// tenant-customizable (a clinician editing a clinical form's fields is a
// much bigger liability/QA surface than a CRM message template), so this
// is plain data, not a DB-backed definitions table. Only the *filled*
// instances are stored (clinical_template_instances).

export type ClinicalFieldType = 'text' | 'textarea' | 'date'
export type ClinicalAutofill = 'contact_name' | 'contact_phone' | 'today'

export type ClinicalField = {
  key: string
  label: string
  type: ClinicalFieldType
  autofill?: ClinicalAutofill
  highlight?: boolean // visually flags safety-critical fields (e.g. SI/HI screening)
}

export type ClinicalTemplateType = 'intake' | 'progress_note' | 'treatment_plan' | 'discharge'

export type ClinicalTemplateDef = {
  type: ClinicalTemplateType
  label: string
  description: string
  fields: ClinicalField[]
}

export const CLINICAL_TEMPLATES: Record<ClinicalTemplateType, ClinicalTemplateDef> = {
  intake: {
    type: 'intake',
    label: 'Patient Intake Form',
    description: 'Demographics, history, and initial screening for a new patient.',
    fields: [
      { key: 'patient_name', label: 'Patient name', type: 'text', autofill: 'contact_name' },
      { key: 'dob', label: 'Date of birth', type: 'date' },
      { key: 'phone', label: 'Contact phone', type: 'text', autofill: 'contact_phone' },
      { key: 'insurance_provider', label: 'Insurance provider', type: 'text' },
      { key: 'insurance_id', label: 'Insurance ID', type: 'text' },
      { key: 'chief_complaint', label: 'Chief complaint', type: 'textarea' },
      { key: 'psychiatric_history', label: 'Psychiatric history (diagnoses, past treatments)', type: 'textarea' },
      { key: 'current_medications', label: 'Current medications', type: 'textarea' },
      { key: 'substance_use_history', label: 'Substance use history', type: 'textarea' },
      { key: 'si_hi_screening', label: 'Suicidal / homicidal ideation screening', type: 'textarea', highlight: true },
      { key: 'clinician_signature', label: 'Clinician signature', type: 'text' },
      { key: 'signed_date', label: 'Date', type: 'date', autofill: 'today' },
    ],
  },
  progress_note: {
    type: 'progress_note',
    label: 'Progress Note',
    description: 'SOAP-format note for a single session.',
    fields: [
      { key: 'patient_name', label: 'Patient name', type: 'text', autofill: 'contact_name' },
      { key: 'session_date', label: 'Session date', type: 'date', autofill: 'today' },
      { key: 'session_time', label: 'Session time', type: 'text' },
      { key: 'chief_complaint_session', label: 'Chief complaint this session', type: 'textarea' },
      { key: 'subjective', label: 'Subjective — patient report', type: 'textarea' },
      { key: 'objective', label: 'Objective — clinician observations', type: 'textarea' },
      { key: 'assessment', label: 'Assessment — diagnosis, current status', type: 'textarea' },
      { key: 'plan', label: 'Plan — next steps, medication adjustments, referrals', type: 'textarea' },
      { key: 'clinician_signature', label: 'Clinician signature', type: 'text' },
      { key: 'signed_date', label: 'Date', type: 'date', autofill: 'today' },
    ],
  },
  treatment_plan: {
    type: 'treatment_plan',
    label: 'Treatment Plan',
    description: 'Goals, interventions, and medication regimen.',
    fields: [
      { key: 'patient_name', label: 'Patient name', type: 'text', autofill: 'contact_name' },
      { key: 'diagnoses', label: 'Diagnoses (DSM-5 codes if available)', type: 'textarea' },
      { key: 'goals_short_term', label: 'Short-term goals', type: 'textarea' },
      { key: 'goals_long_term', label: 'Long-term goals', type: 'textarea' },
      { key: 'interventions', label: 'Interventions planned', type: 'textarea' },
      { key: 'medication_regimen', label: 'Medication regimen', type: 'textarea' },
      { key: 'follow_up_schedule', label: 'Follow-up schedule', type: 'text' },
      { key: 'clinician_signature', label: 'Clinician signature', type: 'text' },
      { key: 'patient_signature', label: 'Patient signature', type: 'text' },
      { key: 'signed_date', label: 'Date', type: 'date', autofill: 'today' },
    ],
  },
  discharge: {
    type: 'discharge',
    label: 'Discharge Summary',
    description: 'Final summary of treatment and next-provider referrals.',
    fields: [
      { key: 'patient_name', label: 'Patient name', type: 'text', autofill: 'contact_name' },
      { key: 'treatment_start_date', label: 'Treatment start date', type: 'date' },
      { key: 'treatment_end_date', label: 'Treatment end date', type: 'date', autofill: 'today' },
      { key: 'final_diagnoses', label: 'Final diagnoses', type: 'textarea' },
      { key: 'treatment_summary', label: 'Treatment summary', type: 'textarea' },
      { key: 'medications_at_discharge', label: 'Medications at discharge', type: 'textarea' },
      { key: 'referrals_next_provider', label: 'Referrals / next provider', type: 'textarea' },
      { key: 'clinician_signature', label: 'Clinician signature', type: 'text' },
      { key: 'signed_date', label: 'Date', type: 'date', autofill: 'today' },
    ],
  },
}

export const CLINICAL_TEMPLATE_LIST = Object.values(CLINICAL_TEMPLATES)
