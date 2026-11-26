"use client";
import {
  ShellPanelMeterRow,
  ShellPanelRow,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@vxture/design-system";

/** Display projection only; platform integration owns authoritative values. */
export interface WorkspaceResourceMetric {
  used: number;
  limit: number;
}
export interface WorkspaceResourceUsage {
  aiCredit: WorkspaceResourceMetric;
  storage: WorkspaceResourceMetric;
}

function bytes(value: number): string {
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let amount = value,
    index = 0;
  while (amount >= 1024 && index < units.length - 1) {
    amount /= 1024;
    index++;
  }
  return `${amount.toFixed(amount >= 100 || index === 0 ? 0 : 1)} ${units[index]}`;
}

/** DS meter presentation; the product supplies only values and tooltip content. */
export function ProductResourceMeter({
  storage = false,
  metric,
}: {
  storage?: boolean;
  metric?: WorkspaceResourceMetric;
}) {
  const label = storage ? "\u5b58\u50a8\u5bb9\u91cf" : "AI \u70b9\u6570";
  const icon = storage ? "database" : "sparkles";
  if (
    !metric ||
    !Number.isFinite(metric.used) ||
    !Number.isFinite(metric.limit) ||
    metric.used < 0 ||
    metric.limit < 0
  ) {
    return (
      <ShellPanelRow
        icon={icon}
        label={label}
        description="workspace"
        value={"\u5bf9\u63a5\u4e2d"}
      />
    );
  }
  const format = (value: number) =>
    storage ? bytes(value) : `${value.toLocaleString("en-US")} \u70b9`;
  const percent =
    metric.limit > 0
      ? (metric.used / metric.limit) * 100
      : metric.used > 0
        ? 100
        : 0;
  const [amount, unit] = storage
    ? bytes(metric.limit).split(" ")
    : [metric.limit.toLocaleString("en-US"), "\u70b9"];
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div tabIndex={0} aria-label={label}>
            <ShellPanelMeterRow
              icon={icon}
              label={label}
              description="workspace"
              value={amount}
              unit={unit}
              percent={percent}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          align="center"
          sideOffset={12}
          collisionPadding={12}
          avoidCollisions
          sticky="always"
          className="text-body-small font-normal"
        >
          <div className="flex flex-col gap-2xs">
            <span>
              {"\u603b\u989d\u5ea6 "}
              {format(metric.limit)}
            </span>
            <span>
              {"\u5df2\u4f7f\u7528 "}
              {format(metric.used)} ({Math.round(percent)}%)
            </span>
            <span>
              {"\u5269\u4f59\u91cf "}
              {format(Math.max(0, metric.limit - metric.used))}
            </span>
            {metric.used > metric.limit && (
              <span>
                {"\u8d85\u7528 "}
                {format(metric.used - metric.limit)}
              </span>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
