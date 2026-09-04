import * as React from "react"
import { cn } from "@/lib/utils"

function Alert({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & { variant?: "default" | "warning" | "destructive" }) {
  return (
    <div
      role="status"
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        variant === "default" && "border-border bg-muted/50",
        variant === "warning" && "border-amber-300 bg-amber-50 text-amber-950",
        variant === "destructive" && "border-destructive/40 bg-destructive/10",
        className,
      )}
      {...props}
    />
  )
}

export { Alert }
