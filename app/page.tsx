import Link from 'next/link'

export default function HomePage() {
  return (
    <main style={{ padding: 40, fontFamily: 'Inter, sans-serif' }}>
      <h1>Quiz OS</h1>
      <p>Public quizzes live at /q/[clientSlug]/[quizSlug].</p>
      <p>
        <Link href="/admin">Go to admin →</Link>
      </p>
    </main>
  )
}
