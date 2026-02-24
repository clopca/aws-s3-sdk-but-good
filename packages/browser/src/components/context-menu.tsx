import type { ReactNode } from "react";
import {
  ContextMenu as ContextMenuPrimitive,
  ContextMenuContent,
  ContextMenuItem as StyledContextMenuItem,
  ContextMenuTrigger,
} from "./ui";

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
}

export function ContextMenu({ items, children }: ContextMenuProps) {
  return (
    <ContextMenuPrimitive>
      <ContextMenuTrigger className="contents">{children}</ContextMenuTrigger>
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
}
