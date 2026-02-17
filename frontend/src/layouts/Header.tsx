import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

export function Header() {
    return (
        <header className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background/80 px-3 py-3 backdrop-blur-md transition-all">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2">
                <h1 className="text-sm font-medium">Workflow Automation</h1>
            </div>
        </header>
    )
}
