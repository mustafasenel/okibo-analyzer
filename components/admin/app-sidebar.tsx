"use client"

import * as React from "react"
import { IconDashboard, IconHome, IconSettings, IconHelpCircle } from "@tabler/icons-react"
import { NavMain } from "@/components/admin/nav-main"
import { NavUser } from "@/components/admin/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { Session } from "next-auth"

// Define the structure of the user prop
interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: Session["user"];
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  
  const navMain = [
    {
      title: "Firmalar",
      url: "/admin/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Ana Uygulama",
      url: "/",
      icon: IconHome,
    },
  ];

  const navSecondary = [
    {
      title: "Ayarlar",
      url: "/settings",
      icon: IconSettings,
    },
    {
      title: "Destek",
      url: "#",
      icon: IconHelpCircle,
    },
  ];


  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <Link href="/admin/dashboard">
                <span className="text-lg font-semibold">Okibo Panel</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavMain items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
