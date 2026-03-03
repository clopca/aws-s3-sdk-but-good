/**
 * @s3-good/browser
 *
 * Browser-focused UI and hooks for S3 file management.
 */

export { getCodeLanguage, getPreviewType } from "s3-good/types";

export type {
  BrowserAction,
  BrowserActionPayload,
  BrowserActionResponse,
  BrowserConfig,
  BrowserFile,
  BrowserFolder,
  BrowserItem,
  PreviewType,
  SortConfig,
  SortDirection,
  SortField,
  ViewMode,
} from "s3-good/types";

export { createBrowserStore } from "./state";
export type { BrowserState, BrowserStore } from "./state";

export { createBrowserClient } from "./client";
export type {
  BrowserClient,
  BrowserClientError,
  BrowserClientOptions,
  DeleteResult,
  ListResult,
} from "./client";

export {
  useBrowser,
  useBreadcrumbs,
  useFilePreview,
  useFileSelection,
  useKeyboardShortcuts,
  useSearch,
} from "./hooks";
export type {
  BreadcrumbSegment,
  SelectionClickEvent,
  UseKeyboardShortcutsOptions,
  UseBrowserOptions,
  UseBrowserReturn,
} from "./hooks";

export {
  Breadcrumbs,
  ConfirmDialog,
  ContextMenu,
  CreateFolderDialog,
  EmptyState,
  FileGrid,
  FileGridSkeleton,
  FileIcon,
  FileItem,
  FileListSkeleton,
  FileListView,
  FileThumbnail,
  FolderIcon,
  PreviewModal,
  RenameDialog,
  SearchBar,
  SelectionBar,
  Skeleton,
  S3Browser,
  S3BrowserRoot,
  useS3BrowserContext,
  Toolbar,
  getPreviewComponent,
  UploadOverlay,
  // Compound sub-components (context-connected)
  BrowserToolbar,
  BrowserBreadcrumbs,
  BrowserSearchBar,
  BrowserFileView,
  BrowserSelectionBar,
  BrowserPreviewModal,
  BrowserUploadButton,
} from "./components";

export type {
  FileGridVirtualizationOptions,
  FileListVirtualizationOptions,
  PreviewRendererProps,
  S3BrowserNotification,
  S3BrowserPaginationOptions,
  S3BrowserProps,
  S3BrowserRenderContext,
  S3BrowserRootProps,
  UploadOverlayProps,
  // Compound sub-component prop types
  BrowserToolbarProps,
  BrowserBreadcrumbsProps,
  BrowserSearchBarProps,
  BrowserFileViewProps,
  BrowserSelectionBarProps,
  BrowserPreviewModalProps,
  BrowserUploadButtonProps,
} from "./components";
export { BrowserProvider, useBrowserContext } from "./context";
export type {
  BrowserContextValue,
  BrowserProviderProps,
  BrowserUploadConfig,
} from "./context";

export { generateBrowserHelpers } from "./generate-helpers";
export type { GenerateBrowserHelpersOptions } from "./generate-helpers";
