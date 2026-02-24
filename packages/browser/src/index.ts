/**
 * @s3-good/browser
 *
 * Browser-focused UI and hooks for S3 file management.
 */

export {
  getCodeLanguage,
  getPreviewType,
} from "@s3-good/shared";

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
} from "@s3-good/shared";

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
  useSearch,
} from "./hooks";
export type {
  BreadcrumbSegment,
  SelectionClickEvent,
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
  FileIcon,
  FileItem,
  FileListView,
  FolderIcon,
  PreviewModal,
  RenameDialog,
  SearchBar,
  SelectionBar,
  S3Browser,
  S3BrowserRoot,
  useS3BrowserContext,
  Toolbar,
  getPreviewComponent,
} from "./components";

export type {
  FileGridVirtualizationOptions,
  FileListVirtualizationOptions,
  PreviewRendererProps,
  S3BrowserProps,
  S3BrowserRenderContext,
} from "./components";
export { generateBrowserHelpers } from "./generate-helpers";
export type { GenerateBrowserHelpersOptions } from "./generate-helpers";
