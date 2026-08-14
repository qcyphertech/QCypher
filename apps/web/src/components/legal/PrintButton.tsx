'use client'

export function PrintButton({ label = 'Download as PDF' }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="print-btn"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        fontSize: '14px', fontWeight: 700, color: '#fff',
        background: 'linear-gradient(135deg, #2a52a0, #4a9db5)',
        border: 'none', borderRadius: '10px', padding: '10px 20px',
        cursor: 'pointer',
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 15V3M7 10l5 5 5-5" /><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
      </svg>
      {label}
    </button>
  )
}
