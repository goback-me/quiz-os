'use client'

import { useState, useTransition } from 'react'

export default function QuizStatusToggle({
  quizId,
  initialStatus,
  toggleStatus,
}: {
  quizId: string
  initialStatus: string
  toggleStatus: (formData: FormData) => Promise<void>
}) {
  const [isLive, setIsLive] = useState(initialStatus === 'live')
  const [, startTransition] = useTransition()

  function handleToggle() {
    const next = !isLive
    setIsLive(next)
    const formData = new FormData()
    formData.set('quizId', quizId)
    formData.set('status', next ? 'live' : 'draft')
    startTransition(() => toggleStatus(formData))
  }

  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={isLive} onChange={handleToggle} className="sr-only peer" />
      <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-black transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
    </label>
  )
}
