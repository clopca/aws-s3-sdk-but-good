export type {
  FileRouter,
  FileRoute,
  AnyParams,
  inferEndpointInput,
  inferEndpointOutput,
  inferEndpoints,
  inferServerData,
  inferMetadata,
  PermittedFileInfo,
  UnsetMarker,
} from "./_internal/types";

export type {
  S3Config,
  UploadedFile,
  UploadFileResponse,
  FileSize,
  AllowedFileType,
  ExpandedRouteConfig,
  FileRouteConfig,
} from "@s3-good/shared";

export { UploadError, S3Error } from "@s3-good/shared";
