'use client'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="text-[15px] font-bold px-4 py-2 rounded-xl text-white"
      style={{ background: 'linear-gradient(135deg,#2a52a0,#4a9db5)' }}
    >
      Print / Save as PDF
    </button>
  )
}
