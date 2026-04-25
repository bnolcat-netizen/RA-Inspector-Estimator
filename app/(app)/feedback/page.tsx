import { getCurrentUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

interface IssueStats {
  issue_type: string
  confirmed: number
  edited: number
  rejected: number
  pending: number
  total: number
  reviewed: number
  accuracy: number | null
  rejectionRate: number | null
  editRate: number | null
}

export default async function FeedbackPage() {
  const user = await getCurrentUser()
  const supabase = await createClient()

  const { data: findings, error } = await supabase
    .from('findings')
    .select('issue_type, status')
    .eq('account_id', user.account_id)
    .not('ai_raw', 'is', null)

  if (error) {
    return (
      <div className="text-red-600 text-sm">
        Failed to load feedback data. Please refresh the page.
      </div>
    )
  }

  const statsMap: Record<string, { confirmed: number; edited: number; rejected: number; pending: number }> = {}

  for (const f of findings ?? []) {
    if (!statsMap[f.issue_type]) {
      statsMap[f.issue_type] = { confirmed: 0, edited: 0, rejected: 0, pending: 0 }
    }
    if (f.status === 'confirmed') statsMap[f.issue_type].confirmed++
    else if (f.status === 'edited') statsMap[f.issue_type].edited++
    else if (f.status === 'rejected') statsMap[f.issue_type].rejected++
    else if (f.status === 'ai_suggested') statsMap[f.issue_type].pending++
  }

  const rows: IssueStats[] = Object.entries(statsMap).map(([issue_type, counts]) => {
    const reviewed = counts.confirmed + counts.edited + counts.rejected
    return {
      issue_type,
      ...counts,
      total: reviewed + counts.pending,
      reviewed,
      accuracy: reviewed > 0 ? counts.confirmed / reviewed : null,
      rejectionRate: reviewed > 0 ? counts.rejected / reviewed : null,
      editRate: reviewed > 0 ? counts.edited / reviewed : null,
    }
  }).sort((a, b) => b.total - a.total)

  const totals = rows.reduce(
    (acc, r) => ({
      total: acc.total + r.total,
      reviewed: acc.reviewed + r.reviewed,
      confirmed: acc.confirmed + r.confirmed,
      edited: acc.edited + r.edited,
      rejected: acc.rejected + r.rejected,
      pending: acc.pending + r.pending,
    }),
    { total: 0, reviewed: 0, confirmed: 0, edited: 0, rejected: 0, pending: 0 }
  )

  const overallAccuracy = totals.reviewed > 0 ? totals.confirmed / totals.reviewed : null
  const overallRejectionRate = totals.reviewed > 0 ? totals.rejected / totals.reviewed : null
  const overallEditRate = totals.reviewed > 0 ? totals.edited / totals.reviewed : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">AI Feedback Report</h1>
        <p className="text-sm text-gray-500 mt-1">
          Accuracy of AI-suggested findings, broken down by issue type.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="AI Findings" value={totals.total} />
        <SummaryCard label="Reviewed" value={totals.reviewed} />
        <SummaryCard
          label="Accuracy"
          value={overallAccuracy !== null ? `${Math.round(overallAccuracy * 100)}%` : '—'}
          signal={overallAccuracy !== null ? (overallAccuracy >= 0.8 ? 'green' : overallAccuracy >= 0.6 ? 'yellow' : 'red') : 'gray'}
        />
        <SummaryCard
          label="Hallucination Rate"
          value={overallRejectionRate !== null ? `${Math.round(overallRejectionRate * 100)}%` : '—'}
          signal={overallRejectionRate !== null ? (overallRejectionRate <= 0.1 ? 'green' : overallRejectionRate <= 0.25 ? 'yellow' : 'red') : 'gray'}
        />
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No AI findings reviewed yet. Data will appear as findings are confirmed, edited, or rejected.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Issue Type</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Confirmed</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Edited</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Rejected</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Pending</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Accuracy</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Signal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(row => (
                  <tr key={row.issue_type} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{row.issue_type}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{row.total}</td>
                    <td className="px-4 py-3 text-right text-green-700">{row.confirmed}</td>
                    <td className="px-4 py-3 text-right text-yellow-700">{row.edited}</td>
                    <td className="px-4 py-3 text-right text-red-600">{row.rejected}</td>
                    <td className="px-4 py-3 text-right text-gray-400">{row.pending}</td>
                    <td className="px-4 py-3 text-right">
                      {row.accuracy !== null ? (
                        <span className={
                          row.accuracy >= 0.8 ? 'text-green-700' :
                          row.accuracy >= 0.6 ? 'text-yellow-700' :
                          'text-red-600'
                        }>
                          {Math.round(row.accuracy * 100)}%
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <SignalBadge reviewed={row.reviewed} rejectionRate={row.rejectionRate} editRate={row.editRate} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400">
            Accuracy = confirmed &divide; reviewed. Pending findings (not yet reviewed) are excluded from accuracy calculations.
            Only AI-suggested findings are counted; manual annotations are excluded.
          </p>
        </>
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  signal,
}: {
  label: string
  value: string | number
  signal?: 'green' | 'yellow' | 'red' | 'gray'
}) {
  const valueColor =
    signal === 'green' ? 'text-green-700' :
    signal === 'yellow' ? 'text-yellow-700' :
    signal === 'red' ? 'text-red-600' :
    'text-gray-900'

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${valueColor}`}>{value}</p>
    </div>
  )
}

function SignalBadge({
  reviewed,
  rejectionRate,
  editRate,
}: {
  reviewed: number
  rejectionRate: number | null
  editRate: number | null
}) {
  if (reviewed < 3) {
    return <span className="text-xs text-gray-400">Not enough data</span>
  }

  if (rejectionRate !== null && rejectionRate > 0.25) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">Hallucinating</span>
  }

  if (
    (rejectionRate !== null && rejectionRate > 0.1) ||
    (editRate !== null && editRate > 0.4)
  ) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">Review prompts</span>
  }

  return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Good</span>
}
