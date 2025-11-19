'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

interface PaymentStatus {
  status: string
  amount: number
  currency: string
}

export default function SuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided')
      setLoading(false)
      return
    }

    const fetchPaymentStatus = async () => {
      try {
        const mcpServerUrl = process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'https://localhost:8443'
        
        // Note: In a production implementation, you would:
        // 1. First retrieve the checkout session to get the payment_intent_id
        // 2. Then call stripe_get_payment_status with that payment_intent_id
        // 
        // For now, we'll show a success state with the session_id
        // The payment_intent would be retrieved from the checkout session
        
        // Simulated successful payment for demo
        // In production, replace this with actual API calls:
        // 1. GET checkout session from Stripe API (or add MCP endpoint)
        // 2. Extract payment_intent_id from session
        // 3. Call MCP stripe_get_payment_status with payment_intent_id
        
        setPaymentStatus({
          status: 'succeeded',
          amount: 4999, // Example amount - would come from actual payment
          currency: 'usd',
        })
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch payment status')
        setLoading(false)
      }
    }

    fetchPaymentStatus()
  }, [sessionId])

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {loading ? (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-gray-600">Verifying payment...</p>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Error</h1>
            <p className="text-gray-600">{error}</p>
            <a
              href="/"
              className="inline-block mt-4 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Go Home
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Payment Successful
              </h1>
              <p className="text-gray-600">
                Your payment has been processed successfully
              </p>
            </div>

            {paymentStatus && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-left">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-semibold text-gray-900">
                    {formatAmount(paymentStatus.amount || 0, paymentStatus.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-semibold text-green-600 capitalize">
                    {paymentStatus.status}
                  </span>
                </div>
                {sessionId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Session ID:</span>
                    <span className="font-mono text-xs text-gray-500 truncate ml-2">
                      {sessionId}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3 pt-4">
              <a
                href="/"
                className="block w-full px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Continue Shopping
              </a>
              <a
                href="https://chat.openai.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-6 py-3 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Return to ChatGPT
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

