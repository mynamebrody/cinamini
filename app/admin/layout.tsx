import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { 
  Home,
  Puzzle,
  Film,
  Database,
  Settings,
  ExternalLink,
  CalendarDays,
  BarChart3,
  PenTool,
  Mailbox,
  Users
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
    { name: "Puzzle Editor", href: "/admin/puzzle-editor", icon: PenTool },
    { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { name: "Schedule", href: "/admin/schedule", icon: CalendarDays },
    { name: "Movie Search", href: "/admin/movies", icon: Film },
    { name: "User Controls", href: "/admin/users", icon: Users },
    { 
      name: "Supabase DB", 
      href: process.env.NODE_ENV !== "production" 
        ? "http://127.0.0.1:54323/" 
        : process.env.NEXT_PUBLIC_SUPABASE_URL || "https://supabase.com", 
      icon: Database, 
      external: true 
    },
    ...(process.env.NODE_ENV !== "production"
      ? [{
          name: "Email (Mailpit)",
          href: "http://localhost:54324/",
          icon: Mailbox,
          external: true
        }]
      : []),
  ]

  return (
    <div className="min-h-screen bg-white">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 min-h-screen bg-white border-r-2 border-neutral-200" style={{
          boxShadow: '4px 0 0 0 rgba(0,0,0,0.05)'
        }}>
          <div className="p-6 border-b-2 border-neutral-200">
            <h2 className="text-2xl font-funnel-display-bold text-neutral-900">Admin Panel</h2>
            <p className="text-sm text-neutral-600 mt-1 font-funnel">Welcome, {profile.display_name}</p>
          </div>
          
          <nav className="px-4 py-6">
            <ul className="space-y-2">
              {navigation.map((item) => (
                <li key={item.name}>
                  {item.external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium font-funnel text-neutral-700 border-2 border-transparent hover:bg-neutral-50 hover:text-cinema-red hover:border-cinema-red transition-all duration-200 group"
                      style={{
                        borderRadius: 0
                      }}
                    >
                      <item.icon className="w-5 h-5 group-hover:text-cinema-red" />
                      {item.name}
                      <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                    </a>
                  ) : (
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium font-funnel text-neutral-700 border-2 border-transparent hover:bg-neutral-50 hover:text-cinema-red hover:border-cinema-red transition-all duration-200 group"
                      style={{
                        borderRadius: 0
                      }}
                    >
                      <item.icon className="w-5 h-5 group-hover:text-cinema-red" />
                      {item.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
          
        </div>
        
        {/* Main Content */}
        <div className="flex-1 bg-neutral-50">
          <main className="p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}