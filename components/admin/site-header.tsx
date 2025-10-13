import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function SiteHeader() {
  return (
    <header className="flex h-[var(--header-height)] shrink-0 items-center gap-2 border-b px-4 lg:px-6">
      <div className="flex w-full items-center gap-1">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-6"
        />
        <h1 className="text-lg font-semibold">Firmalar</h1>
      </div>
    </header>
  )
}
