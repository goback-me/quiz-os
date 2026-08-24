import { ClerkProvider } from '@clerk/nextjs'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata = {
  title: 'Quiz OS',
  description: 'Multi-tenant client quiz platform',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <link
            href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap"
            rel="stylesheet"
          />
        </head>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
