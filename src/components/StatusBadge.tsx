/*
 * Copyright 2026 Amerigo Di Maria
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
