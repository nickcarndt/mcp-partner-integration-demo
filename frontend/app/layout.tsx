import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Payment Checkout',
  description: 'Stripe checkout success and cancel pages',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

