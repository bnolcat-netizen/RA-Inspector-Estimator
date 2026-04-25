import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/server'

async function createJob(formData: FormData) {
  'use server'
  const user = await getCurrentUser()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      account_id: user.account_id,
      created_by: user.id,
      client_name: formData.get('client_name') as string,
      address: formData.get('address') as string,
      city: (formData.get('city') as string) || null,
      state: (formData.get('state') as string) || null,
      zip: (formData.get('zip') as string) || null,
      notes: (formData.get('notes') as string) || null,
    })
    .select('id')
    .single()

  if (error || !data) redirect('/jobs?error=create_failed')
  redirect(`/jobs/${data.id}`)
}

export default function NewJobPage() {
  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-gray-900 mb-6">New Job</h1>

      <form action={createJob} className="space-y-4">
        <Field label="Client name *" name="client_name" required placeholder="John Smith" />
        <Field label="Address *" name="address" required placeholder="123 Main St" />

        <div className="grid grid-cols-2 gap-3">
          <Field label="City" name="city" placeholder="Springfield" />
          <Field label="State" name="state" placeholder="IL" maxLength={2} />
        </div>

        <Field label="ZIP" name="zip" placeholder="62701" inputMode="numeric" />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            name="notes"
            rows={3}
            placeholder="Any notes about the job..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 active:bg-violet-800 mt-2"
        >
          Create Job
        </button>
      </form>
    </div>
  )
}

function Field({
  label, name, required, placeholder, maxLength, inputMode
}: {
  label: string
  name: string
  required?: boolean
  placeholder?: string
  maxLength?: number
  inputMode?: React.InputHTMLAttributes<HTMLInputElement>['inputMode']
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        name={name}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode={inputMode}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
      />
    </div>
  )
}
