import * as React from "react";
import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react";
import { cn } from "./utils";

const ContextMenu = ContextMenuPrimitive.Root;
const ContextMenuTrigger = ContextMenuPrimitive.Trigger;

function ContextMenuContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Popup>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Positioner sideOffset={6}>
        <ContextMenuPrimitive.Popup
          data-state="open"
          className={cn(
            "z-50 min-w-[180px] rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-none",
            className,
          )}
          {...props}
        >
          {children}
        </ContextMenuPrimitive.Popup>
      </ContextMenuPrimitive.Positioner>
    </ContextMenuPrimitive.Portal>
  );
}

function ContextMenuItem({
  className,
  destructive,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Item> & {
  destructive?: boolean;
}) {
  return (
    <ContextMenuPrimitive.Item
      className={cn(
        "block w-full cursor-default rounded-md px-3 py-2 text-left text-sm outline-none transition-colors data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        destructive ? "text-destructive" : "text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem };
