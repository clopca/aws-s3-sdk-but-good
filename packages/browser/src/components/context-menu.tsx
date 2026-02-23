import type { ReactNode } from "react";
import {
  ContextMenuContent,
  ContextMenuItem as ContextMenuItemPrimitive,
  ContextMenuPortal,
  ContextMenuPositioner,
  ContextMenuRoot,
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
    <ContextMenuRoot>
      <ContextMenuTrigger className="contents">{children}</ContextMenuTrigger>
      <ContextMenuPortal>
        <ContextMenuPositioner sideOffset={6}>
          <ContextMenuContent className="z-50 min-w-[180px] rounded-lg border border-slate-200 bg-white p-1 shadow-lg outline-none">
            {items.map((item) => (
              <ContextMenuItemPrimitive
                key={item.key}
                disabled={item.disabled}
                className={`block w-full rounded-md px-3 py-2 text-left text-sm outline-none transition-colors data-[highlighted]:bg-slate-100 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 ${
                  item.destructive ? "text-rose-600 data-[highlighted]:bg-rose-50" : "text-slate-700"
                }`}
                onClick={item.onSelect}
              >
                {item.label}
              </ContextMenuItemPrimitive>
            ))}
          </ContextMenuContent>
        </ContextMenuPositioner>
      </ContextMenuPortal>
    </ContextMenuRoot>
  );
}
