"use client"

import { signOut } from "next-auth/react"
import { IconLogout, IconUser } from "@tabler/icons-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Session } from "next-auth"

interface NavUserProps {
  user: Session["user"];
}

export function NavUser({ user }: NavUserProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="-m-1.5 flex items-center p-1.5" asChild>
        <button className="flex items-center">
            <div className="flex size-8 items-center justify-center rounded-full bg-gray-600 text-gray-50">
              <IconUser className="size-5" />
            </div>
            <div className="ml-3 hidden text-left lg:block">
              <p className="text-sm font-medium text-gray-200 group-data-[collapsed=true]:hidden">
                Admin
              </p>
              <p className="text-xs text-gray-400 group-data-[collapsed=true]:hidden">
                {user.email}
              </p>
            </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Admin</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/admin/login" })}>
          <IconLogout className="mr-2 h-4 w-4" />
          <span>Çıkış Yap</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
