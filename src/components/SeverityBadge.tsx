import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const severityStyles: Record<string, string> = {
  critical: "bg-severity-critical/20 text-severity-critical border-severity-critical/30",
  high: "bg-severity-high/20 text-severity-high border-severity-high/30",
  medium: "bg-severity-medium/20 text-severity-medium border-severity-medium/30",
  warning: "bg-severity-warning/20 text-severity-warning border-severity-warning/30",
  low: "bg-severity-low/20 text-severity-low border-severity-low/30",
  info: "bg-severity-info/20 text-severity-info border-severity-info/30",
};

export function SeverityBadge({ severity }: { severity: string }) {
  return (
    <Badge variant="outline" className={cn("text-xs capitalize font-mono", severityStyles[severity] || severityStyles.info)}>
      {severity}
    </Badge>
  );
}
