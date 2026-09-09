'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const UNDO_WINDOW_MS = 6000

// There's no real way to "recall" an email once it's actually been
// delivered — no protocol-level unsend exists for ordinary SMTP mail to
// an outside inbox (unlike, say, an internal Exchange-to-Exchange
// recall). The practical equivalent, and what this hook provides, is a
// short delay before the send actually goes out — like Gmail's own
// "Undo Send" — during which the tenant can cancel before anything
// leaves the server.
export function useUndoSend(onFire: () => void | Promise<void>) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const timeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onFireRef   = useRef(onFire)
  onFireRef.current = onFire

  const clear = useCallback(() => {
    if (timeoutRef.current)  clearTimeout(timeoutRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
    timeoutRef.current = null
    intervalRef.current = null
  }, [])

  const start = useCallback(() => {
    clear()
    setSecondsLeft(Math.ceil(UNDO_WINDOW_MS / 1000))
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => (s === null ? null : Math.max(0, s - 1)))
    }, 1000)
    timeoutRef.current = setTimeout(() => {
      clear()
      setSecondsLeft(null)
      onFireRef.current()
    }, UNDO_WINDOW_MS)
  }, [clear])

  const cancel = useCallback(() => {
    clear()
    setSecondsLeft(null)
  }, [clear])

  useEffect(() => clear, [clear])

  return { pending: secondsLeft !== null, secondsLeft, start, cancel }
}
