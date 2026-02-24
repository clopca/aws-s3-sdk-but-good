import { createContext, useContext, type ReactNode } from "react";
import { useBrowser, type UseBrowserOptions, type UseBrowserReturn } from "../hooks";

const S3BrowserContext = createContext<UseBrowserReturn | null>(null);

export interface S3BrowserRootProps extends UseBrowserOptions {
  children: ReactNode | ((browser: UseBrowserReturn) => ReactNode);
}

export function S3BrowserRoot({ children, ...options }: S3BrowserRootProps) {
  const browser = useBrowser(options);
  const content = typeof children === "function" ? children(browser) : children;

  return <S3BrowserContext.Provider value={browser}>{content}</S3BrowserContext.Provider>;
}

export function useS3BrowserContext(): UseBrowserReturn {
  const ctx = useContext(S3BrowserContext);
  if (!ctx) {
    throw new Error("useS3BrowserContext must be used within <S3BrowserRoot>");
  }
  return ctx;
}

