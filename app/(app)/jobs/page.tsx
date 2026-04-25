import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/server'

export default async function JobsPage() {
  const user = await getCurrentUser()
  const supabase = await createClient()

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, client_name, address, city, state, status, created_at')
    .eq('account_id', user.account_id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Jobs</h1>
        <Link
          href="/jobs/new"
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 active:bg-violet-800"
        >
          + New Job
        </Link>
      </div>

      {!jobs?.length ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-base font-medium">No jobs yet</p>
          <p className="text-sm mt-1">Tap + New Job to get started.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link
                href={`/jobs/${job.id}`}
                className="block bg-white border border-gray-200 rounded-xl px-4 py-4 hover:border-violet-300 active:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{job.client_name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {job.address}{job.city ? `, ${job.city}` : ''}{job.state ? `, ${job.state}` : ''}
                    </p>
                  </div>
                  <StatusBadge status={job.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    inspecting: 'bg-blue-50 text-blue-700',
    reviewing: 'bg-yellow-50 text-yellow-700',
    estimating: 'bg-orange-50 text-orange-700',
    complete: 'bg-green-50 text-green-700',
  }
  return (
    <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full capitalize ${styles[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}
