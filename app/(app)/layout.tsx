import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

async function logout() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-base" style={{ color: 'var(--color-primary)' }}>
            RoofEstimate AI
          </span>
          <form action={logout}>
            <button
              type="submit"
              className="text-sm text-gray-500 hover:text-gray-700 active:text-gray-900"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      {/* Desktop sidebar + content */}
      <div className="flex flex-1 max-w-5xl mx-auto w-full">
        <nav className="hidden md:flex flex-col w-48 border-r border-gray-200 bg-white pt-6 shrink-0">
          <NavLink href="/jobs">Jobs</NavLink>
          <NavLink href="/settings">Settings</NavLink>
        </nav>

        <main className="flex-1 px-4 py-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex">
        <MobileNavLink href="/jobs" label="Jobs" />
        <MobileNavLink href="/settings" label="Settings" />
      </nav>
    </div>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg mx-2"
    >
      {children}
    </Link>
  )
}

function MobileNavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex-1 flex flex-col items-center justify-center py-3 text-xs font-medium text-gray-600 hover:text-violet-600 active:text-violet-700"
    >
      {label}
    </Link>
  )
}
