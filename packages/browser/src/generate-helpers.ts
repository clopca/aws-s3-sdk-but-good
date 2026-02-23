import { useBrowser, type UseBrowserOptions } from "./hooks";

export interface GenerateBrowserHelpersOptions {
  url?: string;
  headers?: HeadersInit | (() => Promise<HeadersInit> | HeadersInit);
}

export function generateBrowserHelpers(opts: GenerateBrowserHelpersOptions = {}) {
  function useBrowserTyped(options: UseBrowserOptions = {}) {
    return useBrowser({
      ...options,
      url: options.url ?? opts.url,
      headers: options.headers ?? opts.headers,
    });
  }

  return {
    useBrowser: useBrowserTyped,
  } as const;
}
