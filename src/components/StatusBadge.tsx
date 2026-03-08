import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  open: "bg-status-open/20 text-status-open border-status-open/30",
  investigating: "bg-status-investigating/20 text-status-investigating border-status-investigating/30",
  mitigated: "bg-status-mitigated/20 text-status-mitigated border-status-mitigated/30",
  closed: "bg-status-closed/20 text-status-closed border-status-closed/30",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("text-xs capitalize font-mono", statusStyles[status] || statusStyles.closed)}>
      {status}
    </Badge>
  );
}
