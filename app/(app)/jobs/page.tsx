export default function JobsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Jobs</h1>
        <button
          disabled
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-violet-600 opacity-50 cursor-not-allowed"
        >
          + New Job
        </button>
      </div>

      <div className="text-center py-16 text-gray-400">
        <p className="text-base font-medium">No jobs yet</p>
        <p className="text-sm mt-1">Phase 2 will add job creation and photo upload.</p>
      </div>
    </div>
  )
}
