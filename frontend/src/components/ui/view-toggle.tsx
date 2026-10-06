import { LayoutList, LayoutGrid } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ViewToggleProps {
  value: 'list' | 'grid';
  onChange: (value: 'list' | 'grid') => void;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="inline-flex items-center rounded-lg bg-muted p-1">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => onChange('list')}
        aria-label="List view"
        className={cn("h-8 w-8 px-0", value === 'list' && "bg-background shadow-sm")}
      >
        <LayoutList className="h-4 w-4" />
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => onChange('grid')}
        aria-label="Grid view"
        className={cn("h-8 w-8 px-0", value === 'grid' && "bg-background shadow-sm")}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
    </div>
  )
}
