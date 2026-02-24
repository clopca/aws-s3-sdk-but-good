import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { S3Browser } from "../components";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

describe("S3Browser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      action: "list",
      success: true,
      items: [],
      isTruncated: false,
    }), { status: 200 }));
  });

  afterEach(() => {
    cleanup();
  });

  it("renders toolbar and bucket selector and fetches list", async () => {
    render(
      <S3Browser
        url="/api/browser"
        config={{ buckets: ["bucket-a", "bucket-b"], defaultBucket: "bucket-a" }}
      />,
    );

    expect(screen.getByRole("button", { name: "Grid" })).toBeTruthy();
    expect(screen.getByText("bucket-a")).toBeTruthy();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
  });

  it("invokes custom upload handler on drop", async () => {
    const onUploadFiles = vi.fn().mockResolvedValue(undefined);

    const { container } = render(
      <S3Browser
        url="/api/browser"
        upload={{ onUploadFiles }}
      />,
    );

    const root = container.firstElementChild as HTMLElement;
    const file = new File(["hello"], "drop.txt", { type: "text/plain" });
    fireEvent.drop(root, {
      dataTransfer: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(onUploadFiles).toHaveBeenCalled();
    });
  });

  it("supports render-prop composition API", async () => {
    const { container } = render(
      <S3Browser url="/api/browser">
        {(ctx) => (
          <div>
            <span data-testid="path">{ctx.browser.currentPath}</span>
          </div>
        )}
      </S3Browser>,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    expect(within(container).queryByRole("button", { name: "Grid" })).toBeNull();
    expect(within(container).getByTestId("path")).toBeTruthy();
  });

  it("shows load more button when server marks list as truncated", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      action: "list",
      success: true,
      items: [
        {
          kind: "file",
          key: "a.txt",
          name: "a.txt",
          size: 1,
          contentType: "text/plain",
          lastModified: "2026-01-01T00:00:00.000Z",
        },
      ],
      isTruncated: true,
      nextContinuationToken: "next-token",
    }), { status: 200 }));

    render(<S3Browser url="/api/browser" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Load more" })).toBeTruthy();
    });
  });

  it("requests next page when clicking load more", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({
        action: "list",
        success: true,
        items: [
          {
            kind: "file",
            key: "a.txt",
            name: "a.txt",
            size: 1,
            contentType: "text/plain",
            lastModified: "2026-01-01T00:00:00.000Z",
          },
        ],
        isTruncated: true,
        nextContinuationToken: "next-token",
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        action: "list",
        success: true,
        items: [
          {
            kind: "file",
            key: "b.txt",
            name: "b.txt",
            size: 2,
            contentType: "text/plain",
            lastModified: "2026-01-01T00:00:00.000Z",
          },
        ],
        isTruncated: false,
      }), { status: 200 }));

    render(<S3Browser url="/api/browser" />);

    const loadMoreButton = await screen.findByRole("button", { name: "Load more" });
    fireEvent.click(loadMoreButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    const secondBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body ?? "{}"));
    expect(secondBody.action).toBe("list");
    expect(secondBody.continuationToken).toBe("next-token");
  });

  it("requests next page automatically in infinite pagination mode", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({
        action: "list",
        success: true,
        items: [
          {
            kind: "file",
            key: "a.txt",
            name: "a.txt",
            size: 1,
            contentType: "text/plain",
            lastModified: "2026-01-01T00:00:00.000Z",
          },
        ],
        isTruncated: true,
        nextContinuationToken: "next-token",
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        action: "list",
        success: true,
        items: [],
        isTruncated: false,
      }), { status: 200 }));

    let observerCallback: ((entries: Array<{ isIntersecting: boolean }>) => void) | null = null;
    const originalIntersectionObserver = globalThis.IntersectionObserver;
    class MockIntersectionObserver {
      constructor(callback: (entries: Array<{ isIntersecting: boolean }>) => void) {
        observerCallback = callback;
      }
      disconnect() {}
      observe() {}
      unobserve() {}
      takeRecords() { return []; }
    }

    Object.defineProperty(globalThis, "IntersectionObserver", {
      configurable: true,
      writable: true,
      value: MockIntersectionObserver,
    });

    try {
      render(<S3Browser url="/api/browser" pagination={{ mode: "infinite" }} />);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
      expect(observerCallback).toBeTruthy();
      if (!observerCallback) {
        throw new Error("Expected IntersectionObserver callback to be registered");
      }
      const triggerObserver = observerCallback as (entries: Array<{ isIntersecting: boolean }>) => void;
      triggerObserver([{ isIntersecting: true }]);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(2);
      });

      const secondBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body ?? "{}"));
      expect(secondBody.continuationToken).toBe("next-token");
    } finally {
      Object.defineProperty(globalThis, "IntersectionObserver", {
        configurable: true,
        writable: true,
        value: originalIntersectionObserver,
      });
    }
  });
});
