'use client'

import { useEffect, useState, type RefObject, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Renders its children into a portal on document.body, positioned next to an anchor element via
 * fixed coordinates — instead of `position: absolute` inside the anchor's own DOM position.
 * Anything using plain `absolute` here gets silently clipped whenever the anchor sits inside a
 * scrollable/`overflow` container (e.g. the quizzes table's `overflow-x-auto` wrapper), which is
 * exactly what was happening to the Embed/Delete popovers. A portal has no such ancestor to clip
 * it. Always right-aligns to the anchor and flips above it if there isn't room below.
 */
export default function AnchoredPopover({
  open,
  onClose,
  anchorRef,
  width,
  children,
}: {
  open: boolean
  onClose: () => void
  anchorRef: RefObject<HTMLElement>
  width: number
  children: ReactNode
}) {
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null)

  useEffect(() => {
    if (!open || !anchorRef.current) {
      setPos(null)
      return
    }
    const rect = anchorRef.current.getBoundingClientRect()
    const left = Math.max(8, rect.right - width)
    const spaceBelow = window.innerHeight - rect.bottom
    if (spaceBelow < 260 && rect.top > spaceBelow) {
      setPos({ bottom: window.innerHeight - rect.top + 8, left })
    } else {
      setPos({ top: rect.bottom + 8, left })
    }
  }, [open, anchorRef, width])

  if (!open || !pos || typeof document === 'undefined') return null

  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-lg"
        style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width }}
      >
        {children}
      </div>
    </>,
    document.body
  )
}
