import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  async function signup(formData: FormData) {
    'use server'
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const name = formData.get('name') as string
    const businessName = formData.get('businessName') as string

    const supabase = await createClient()
    const { data, error: authError } = await supabase.auth.signUp({ email, password })
    if (authError) redirect(`/signup?error=${encodeURIComponent(authError.message)}`)
    if (!data.user) redirect(`/signup?error=${encodeURIComponent('Signup failed')}`)

    const service = createServiceClient()
    const { data: account, error: accountError } = await service
      .from('accounts')
      .insert({ name: businessName || name })
      .select('id')
      .single()

    if (accountError) redirect(`/signup?error=${encodeURIComponent(accountError.message)}`)

    await service
      .from('users')
      .insert({ id: data.user.id, account_id: account.id, name })

    redirect('/jobs')
  }

  return (
    <>
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Create account</h2>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={signup} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Your name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-1">
            Business name
          </label>
          <input
            id="businessName"
            name="businessName"
            type="text"
            required
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 active:bg-violet-800 transition-colors"
        >
          Create account
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="text-violet-600 font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </>
  )
}
