import { useMemo, useState } from "react";
import type { BrowserConfig, BrowserFile, BrowserItem } from "@s3-good/shared";
import { useBreadcrumbs, useBrowser, useSearch } from "../hooks";
import type { ContextMenuItem } from "./context-menu";
import { Breadcrumbs } from "./breadcrumbs";
import { ConfirmDialog, CreateFolderDialog, RenameDialog } from "./dialogs";
import { FileGrid } from "./file-grid";
import { FileListView } from "./file-list-view";
import { PreviewModal } from "./preview/preview-modal";
import { SearchBar } from "./search-bar";
import { SelectionBar } from "./selection-bar";
import { Toolbar } from "./toolbar";

export interface S3BrowserProps {
  url?: string;
  headers?: HeadersInit | (() => Promise<HeadersInit> | HeadersInit);
  config?: BrowserConfig;
  className?: string;
}

export function S3Browser({ url, headers, config, className }: S3BrowserProps) {
  const browser = useBrowser({ url, headers, config });
  const breadcrumbs = useBreadcrumbs(browser.currentPath, config?.rootPrefix);
  const search = useSearch(browser.store);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<BrowserItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const previewFile = browser.previewItem?.kind === "file" ? browser.previewItem : null;

  const files = useMemo(
    () => browser.items.filter((item): item is BrowserFile => item.kind === "file"),
    [browser.items],
  );

  const previewIndex = previewFile
    ? files.findIndex((file) => file.key === previewFile.key)
    : -1;

  const openPreview = async (item: BrowserItem) => {
    if (item.kind !== "file") {
      browser.openFolder(item);
      return;
    }

    browser.setPreviewItem(item);
    setPreviewLoading(true);

    try {
      const urlValue = await browser.client.getPreviewUrl(item.key, browser.activeBucket || undefined);
      setPreviewUrl(urlValue);
    } finally {
      setPreviewLoading(false);
    }
  };

  const navigatePreview = async (offset: number) => {
    if (previewIndex < 0) return;
    const nextFile = files[previewIndex + offset];
    if (!nextFile) return;
    browser.setPreviewItem(nextFile);
    setPreviewLoading(true);
    try {
      setPreviewUrl(await browser.client.getPreviewUrl(nextFile.key, browser.activeBucket || undefined));
    } finally {
      setPreviewLoading(false);
    }
  };

  const getContextMenuItems = (item: BrowserItem): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [
      {
        key: "open",
        label: item.kind === "folder" ? "Open folder" : "Open preview",
        onSelect: () => {
          void openPreview(item);
        },
      },
      {
        key: "rename",
        label: "Rename",
        onSelect: () => {
          setRenameTarget(item);
        },
      },
    ];

    if (item.kind === "file") {
      items.push({
        key: "download",
        label: "Download",
        onSelect: () => {
          void browser.downloadFile(item.key);
        },
      });
    }

    items.push({
      key: "delete",
      label: "Delete",
      destructive: true,
      onSelect: () => {
        browser.deselectAll();
        browser.select(item.key);
        setConfirmDeleteOpen(true);
      },
    });

    return items;
  };

  return (
    <div className={`space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5 ${className ?? ""}`.trim()}>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
        <Breadcrumbs segments={breadcrumbs} onNavigate={browser.navigateTo} />
        <SearchBar value={search.inputValue} onChange={search.handleChange} onClear={search.clear} />
      </div>

      <Toolbar
        buckets={config?.buckets}
        activeBucket={browser.activeBucket}
        viewMode={browser.viewMode}
        sort={browser.sort}
        selectedCount={browser.selectedKeys.size}
        onBucketChange={browser.setActiveBucket}
        onViewModeChange={browser.setViewMode}
        onSortChange={browser.setSort}
        onCreateFolder={() => setCreateFolderOpen(true)}
        onDeleteSelected={() => setConfirmDeleteOpen(true)}
        onRefresh={() => void browser.refresh()}
      />

      {browser.error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {browser.error}
        </div>
      ) : null}

      {browser.viewMode === "grid" ? (
        <FileGrid
          items={browser.items}
          selectedKeys={browser.selectedKeys}
          onItemClick={(key, event) => {
            if (event.shiftKey && browser.selectedKeys.size > 0) {
              const lastSelected = Array.from(browser.selectedKeys).pop();
              if (lastSelected) browser.selectRange(lastSelected, key);
              return;
            }
            if (event.ctrlKey || event.metaKey) {
              browser.toggleSelect(key);
              return;
            }
            browser.deselectAll();
            browser.select(key);
          }}
          onItemDoubleClick={(item) => {
            void openPreview(item);
          }}
          onItemContextMenu={(item, event) => {
            event.preventDefault();
            browser.deselectAll();
            browser.select(item.key);
          }}
          getContextMenuItems={getContextMenuItems}
          isLoading={browser.isLoading}
          isSearching={Boolean(browser.searchQuery)}
        />
      ) : (
        <FileListView
          items={browser.items}
          selectedKeys={browser.selectedKeys}
          sort={browser.sort}
          onSort={browser.setSort}
          onItemClick={(key, event) => {
            if (event.shiftKey && browser.selectedKeys.size > 0) {
              const lastSelected = Array.from(browser.selectedKeys).pop();
              if (lastSelected) browser.selectRange(lastSelected, key);
              return;
            }
            if (event.ctrlKey || event.metaKey) {
              browser.toggleSelect(key);
              return;
            }
            browser.deselectAll();
            browser.select(key);
          }}
          onItemDoubleClick={(item) => {
            void openPreview(item);
          }}
          onItemContextMenu={(item, event) => {
            event.preventDefault();
            browser.deselectAll();
            browser.select(item.key);
          }}
          getContextMenuItems={getContextMenuItems}
          isLoading={browser.isLoading}
          isSearching={Boolean(browser.searchQuery)}
        />
      )}

      <SelectionBar
        count={browser.selectedKeys.size}
        onClear={browser.deselectAll}
        onDelete={() => setConfirmDeleteOpen(true)}
      />

      <CreateFolderDialog
        open={createFolderOpen}
        onCancel={() => setCreateFolderOpen(false)}
        onSubmit={(name) => {
          setCreateFolderOpen(false);
          void browser.createFolder(name);
        }}
      />

      <RenameDialog
        open={Boolean(renameTarget)}
        currentName={renameTarget?.name ?? ""}
        onCancel={() => setRenameTarget(null)}
        onSubmit={(newName) => {
          if (!renameTarget) return;
          const targetKey = renameTarget.key;
          setRenameTarget(null);
          void browser.renameItem(targetKey, newName);
        }}
      />

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete selected items"
        description="This action cannot be undone."
        confirmLabel="Delete"
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={() => {
          setConfirmDeleteOpen(false);
          void browser.deleteSelected();
        }}
      />

      {previewFile && previewUrl ? (
        <PreviewModal
          file={previewFile}
          url={previewUrl}
          isLoading={previewLoading}
          onPrev={() => void navigatePreview(-1)}
          onNext={() => void navigatePreview(1)}
          onClose={() => {
            browser.setPreviewItem(null);
            setPreviewUrl(null);
          }}
          onDownload={() => void browser.downloadFile(previewFile.key)}
          hasPrev={previewIndex > 0}
          hasNext={previewIndex >= 0 && previewIndex < files.length - 1}
        />
      ) : null}
    </div>
  );
}
