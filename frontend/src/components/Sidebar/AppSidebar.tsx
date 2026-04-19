import {
  BookOpen,
  Building2,
  Calculator,
  Compass,
  FileText,
  Home,
  Languages,
  Scale,
  UserCheck,
  Users,
} from "lucide-react"

import { SidebarAppearance } from "@/components/Common/Appearance"
import { Logo } from "@/components/Common/Logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import useAuth from "@/hooks/useAuth"
import { type Item, Main } from "./Main"
import { User } from "./User"

const baseItems: Item[] = [
  { icon: Home, title: "Dashboard", path: "/dashboard" },
  { icon: Compass, title: "Journeys", path: "/journeys" },
  { icon: Building2, title: "Portfolio", path: "/portfolio" },
  { icon: FileText, title: "Documents", path: "/documents" },
  { icon: Scale, title: "Laws", path: "/laws" },
  { icon: Languages, title: "Glossary", path: "/glossary" },
  { icon: Calculator, title: "Calculators", path: "/calculators" },
  { icon: BookOpen, title: "Articles", path: "/articles" },
  { icon: UserCheck, title: "Professionals", path: "/professionals" },
]

export function AppSidebar() {
  const { user: currentUser } = useAuth()

  const items = currentUser?.is_superuser
    ? [...baseItems, { icon: Users, title: "Admin", path: "/admin" }]
    : baseItems

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-6 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
        <Logo variant="responsive" />
      </SidebarHeader>
      <SidebarContent>
        <Main items={items} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarAppearance />
        <User user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar
