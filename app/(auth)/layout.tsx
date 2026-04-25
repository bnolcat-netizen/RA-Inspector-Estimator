export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
            RoofEstimate AI
          </h1>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
