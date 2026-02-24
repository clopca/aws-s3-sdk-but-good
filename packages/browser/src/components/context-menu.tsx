import { forwardRef, type ReactNode } from "react";
import {
  ContextMenu as ContextMenuPrimitive,
  ContextMenuContent,
  ContextMenuItem as StyledContextMenuItem,
  ContextMenuTrigger,
} from "./ui";
import { cn } from "./ui";

export interface ContextMenuItem {
  key: string;
  label: string;
  destructive?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export interface ContextMenuProps {
  items: ContextMenuItem[];
  children: ReactNode;
  className?: string;
}

const ContextMenu = forwardRef<HTMLDivElement, ContextMenuProps>(
  ({ items, children, className }, _ref) => {
    return (
      <ContextMenuPrimitive>
        <ContextMenuTrigger className={cn("contents", className)}>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent>
          {items.map((item) => (
            <StyledContextMenuItem
              key={item.key}
              label={item.label}
              disabled={item.disabled}
              destructive={item.destructive}
              onClick={item.onSelect}
            >
              {item.label}
            </StyledContextMenuItem>
          ))}
        </ContextMenuContent>
      </ContextMenuPrimitive>
    );
  },
);
ContextMenu.displayName = "ContextMenu";

export { ContextMenu };
