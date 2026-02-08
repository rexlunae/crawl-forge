import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 border-r bg-white dark:bg-gray-800">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <span className="text-2xl">🕷️</span>
          <span className="text-xl font-bold">CrawlForge</span>
        </div>

        <nav className="p-4 space-y-2">
          <Link 
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <span>📊</span>
            <span>Dashboard</span>
          </Link>
          
          <Link 
            href="/dashboard/crawlers"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <span>🕷️</span>
            <span>Crawlers</span>
          </Link>
          
          <Link 
            href="/dashboard/runs"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <span>📜</span>
            <span>Run History</span>
          </Link>
          
          <Link 
            href="/dashboard/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <span>⚙️</span>
            <span>Settings</span>
          </Link>
        </nav>
      </aside>

      {/* Main content */}
      <main className="pl-64">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-white/80 backdrop-blur-sm px-8 dark:bg-gray-800/80">
          <div />
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {user.email}
            </span>
            <form action="/api/auth/signout" method="post">
              <button 
                type="submit"
                className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>

        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
