import { Link } from "@tanstack/react-router"
import { LogOut, Settings } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import useAuth, { isLoggedIn } from "@/hooks/useAuth"
import { getInitials } from "@/utils"

/******************************************************************************
                              Components
******************************************************************************/

/** Compact auth-aware user menu for navigation bars. Shows a login button when
 * logged out, and a profile avatar dropdown with logout when logged in. */
function NavUserMenu() {
  const { user, logout } = useAuth()

  if (!isLoggedIn()) {
    return (
      <Button variant="ghost" size="sm" asChild>
        <Link to="/login">Log In</Link>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          data-testid="nav-user-menu"
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-zinc-600 text-xs text-white">
              {getInitials(user?.full_name || "User")}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user?.full_name}
            </p>
            <p className="text-muted-foreground text-xs leading-none">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <Link to="/settings">
          <DropdownMenuItem>
            <Settings />
            User Settings
          </DropdownMenuItem>
        </Link>
        <DropdownMenuItem onClick={logout}>
          <LogOut />
          Log Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { NavUserMenu }
