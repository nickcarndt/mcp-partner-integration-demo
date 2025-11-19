'use client'

export default function CancelPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="space-y-6">
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
          
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Payment Canceled
            </h1>
            <p className="text-gray-600">
              Your payment was canceled. No charges were made.
            </p>
          </div>

          <div className="pt-4">
            <a
              href="/"
              className="inline-block w-full px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              Try Again
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

