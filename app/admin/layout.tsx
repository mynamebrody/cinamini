import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { 
  Home,
  Puzzle,
  Film,
  Database,
  Settings,
  LogOut,
  ExternalLink
} from "lucide-react"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  // Double-check admin status (middleware should handle this, but extra safety)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/")
  
  const { data: profile } = await supabase
    .from("cinamini_user_profiles")
    .select("is_super_admin, display_name")
    .eq("user_id", user.id)
    .single()
    
  if (!profile?.is_super_admin) redirect("/")

  const navigation = [
    { name: "Dashboard", href: "/admin", icon: Home },
    { name: "Budget Bracket", href: "/admin/budget-bracket", icon: Puzzle },
    { name: "Retitled", href: "/admin/retitled", icon: Puzzle },
    { name: "Cast Climb", href: "/admin/cast-climb", icon: Puzzle },
    { name: "Movie Search", href: "/admin/movies", icon: Film },
    { name: "Supabase Studio", href: process.env.NEXT_PUBLIC_SUPABASE_URL + "/studio", icon: Database, external: true },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 min-h-screen bg-white border-r border-gray-200">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900">Admin Panel</h2>
            <p className="text-sm text-gray-600 mt-1">Welcome, {profile.display_name}</p>
          </div>
          
          <nav className="px-4 pb-6">
            <ul className="space-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  {item.external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors"
                    >
                      <item.icon className="w-5 h-5" />
                      {item.name}
                      <ExternalLink className="w-3 h-3 ml-auto" />
                    </a>
                  ) : (
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors"
                    >
                      <item.icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
          
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
            <form action="/api/auth/sign-out" method="POST">
              <button
                type="submit"
                className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </form>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1">
          <main className="p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}