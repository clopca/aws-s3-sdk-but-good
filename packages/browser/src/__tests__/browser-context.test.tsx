import { cleanup, render, screen } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BrowserProvider, useBrowserContext } from "../context/browser-context";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

describe("BrowserProvider + useBrowserContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          action: "list",
          success: true,
          items: [],
          isTruncated: false,
        }),
        { status: 200 },
      ),
    );
  });

  afterEach(() => {
    cleanup();
  });

  it("test useBrowserContext throws outside provider", () => {
    // Suppress React error boundary console noise
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => useBrowserContext());
    }).toThrow("must be used within");

    spy.mockRestore();
  });

  it("test BrowserProvider provides context value", () => {
    function Consumer() {
      const ctx = useBrowserContext();
      return <span data-testid="path">{ctx.currentPath}</span>;
    }

    render(
      <BrowserProvider url="/api/browser">
        <Consumer />
      </BrowserProvider>,
    );

    // The consumer should render without throwing, proving context is provided
    expect(screen.getByTestId("path")).toBeTruthy();
  });

  it("test context includes selection methods", () => {
    function Consumer() {
      const ctx = useBrowserContext();
      return (
        <div>
          <span data-testid="handleItemClick">
            {typeof ctx.handleItemClick}
          </span>
          <span data-testid="selectAll">{typeof ctx.selectAll}</span>
          <span data-testid="deselectAll">{typeof ctx.deselectAll}</span>
          <span data-testid="isSelected">{typeof ctx.isSelected}</span>
        </div>
      );
    }

    render(
      <BrowserProvider url="/api/browser">
        <Consumer />
      </BrowserProvider>,
    );

    expect(screen.getByTestId("handleItemClick").textContent).toBe("function");
    expect(screen.getByTestId("selectAll").textContent).toBe("function");
    expect(screen.getByTestId("deselectAll").textContent).toBe("function");
    expect(screen.getByTestId("isSelected").textContent).toBe("function");
  });

  it("test context includes preview methods", () => {
    function Consumer() {
      const ctx = useBrowserContext();
      return (
        <div>
          <span data-testid="openPreview">{typeof ctx.openPreview}</span>
          <span data-testid="closePreview">{typeof ctx.closePreview}</span>
          <span data-testid="navigatePreview">
            {typeof ctx.navigatePreview}
          </span>
        </div>
      );
    }

    render(
      <BrowserProvider url="/api/browser">
        <Consumer />
      </BrowserProvider>,
    );

    expect(screen.getByTestId("openPreview").textContent).toBe("function");
    expect(screen.getByTestId("closePreview").textContent).toBe("function");
    expect(screen.getByTestId("navigatePreview").textContent).toBe("function");
  });
});
