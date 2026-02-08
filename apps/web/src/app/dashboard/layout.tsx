import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { MobileNav } from './mobile-nav';

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

  const navItems = [
    { href: '/dashboard', icon: '📊', label: 'Dashboard' },
    { href: '/dashboard/crawlers', icon: '🕷️', label: 'Crawlers' },
    { href: '/dashboard/runs', icon: '📜', label: 'Run History' },
    { href: '/dashboard/settings', icon: '⚙️', label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Desktop Sidebar - hidden on mobile */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r bg-white dark:bg-gray-800 md:block">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <span className="text-2xl">🕷️</span>
          <span className="text-xl font-bold">CrawlForge</span>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <Link 
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="md:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-white/80 backdrop-blur-sm px-4 md:px-8 dark:bg-gray-800/80">
          {/* Mobile menu */}
          <div className="flex items-center gap-4">
            <MobileNav items={navItems} />
            <div className="flex items-center gap-2 md:hidden">
              <span className="text-xl">🕷️</span>
              <span className="font-bold">CrawlForge</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            <span className="hidden text-sm text-gray-600 dark:text-gray-300 sm:block">
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

        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
