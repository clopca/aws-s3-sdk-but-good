import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { S3Browser } from "../components/s3-browser";
import {
  BrowserToolbar,
  BrowserBreadcrumbs,
  BrowserSearchBar,
  BrowserFileView,
  BrowserSelectionBar,
  BrowserPreviewModal,
  BrowserUploadButton,
} from "../components/compound";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

describe("S3Browser compound pattern", () => {
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

  it("test S3Browser renders default layout", async () => {
    render(
      <S3Browser
        url="/api/browser"
        config={{
          buckets: ["my-bucket"],
          defaultBucket: "my-bucket",
        }}
      />,
    );

    // Wait for initial fetch
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    // Toolbar buttons should be present (Grid/List view mode buttons)
    expect(screen.getByRole("button", { name: "Grid" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "List" })).toBeTruthy();

    // Breadcrumb nav should be present
    expect(screen.getByLabelText("Breadcrumb")).toBeTruthy();

    // Search input should be present
    expect(screen.getByLabelText("Search files")).toBeTruthy();
  });

  it("test S3Browser.Root wraps in provider", async () => {
    render(
      <S3Browser.Root url="/api/browser">
        <div data-testid="child">inside root</div>
      </S3Browser.Root>,
    );

    // Wait for initial fetch
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    // Children should render inside the root container
    expect(screen.getByTestId("child")).toBeTruthy();
    expect(screen.getByTestId("child").textContent).toBe("inside root");
  });

  it("test compound sub-components accessible", () => {
    // All sub-components should be defined as static properties on S3Browser
    expect(S3Browser.Root).toBeDefined();
    expect(S3Browser.Toolbar).toBeDefined();
    expect(S3Browser.Breadcrumbs).toBeDefined();
    expect(S3Browser.SearchBar).toBeDefined();
    expect(S3Browser.FileView).toBeDefined();
    expect(S3Browser.SelectionBar).toBeDefined();
    expect(S3Browser.PreviewModal).toBeDefined();
    expect(S3Browser.UploadButton).toBeDefined();

    // Verify they reference the actual compound components
    expect(S3Browser.Toolbar).toBe(BrowserToolbar);
    expect(S3Browser.Breadcrumbs).toBe(BrowserBreadcrumbs);
    expect(S3Browser.SearchBar).toBe(BrowserSearchBar);
    expect(S3Browser.FileView).toBe(BrowserFileView);
    expect(S3Browser.SelectionBar).toBe(BrowserSelectionBar);
    expect(S3Browser.PreviewModal).toBe(BrowserPreviewModal);
    expect(S3Browser.UploadButton).toBe(BrowserUploadButton);
  });

  it("test custom layout works", async () => {
    const { container } = render(
      <S3Browser.Root url="/api/browser">
        <S3Browser.FileView />
      </S3Browser.Root>,
    );

    // Wait for initial fetch
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    // FileView should render (it shows empty state or grid when no items)
    // Toolbar should NOT be present since we only included FileView
    expect(screen.queryByRole("button", { name: "Grid" })).toBeNull();

    // The root container should exist with data-state
    const rootDiv = container.querySelector("[data-state]");
    expect(rootDiv).toBeTruthy();
  });

  it("test data-state attribute on root", async () => {
    const { container } = render(
      <S3Browser.Root url="/api/browser">
        <div data-testid="child">content</div>
      </S3Browser.Root>,
    );

    // Wait for initial fetch to complete
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    // The root container div should have data-state attribute
    // After loading completes, it should be "ready"
    await waitFor(() => {
      const rootDiv = container.querySelector("[data-state]");
      expect(rootDiv).toBeTruthy();
      expect(rootDiv?.getAttribute("data-state")).toBe("ready");
    });
  });

  it("test UploadButton hidden when no upload config", async () => {
    render(
      <S3Browser.Root url="/api/browser">
        <S3Browser.UploadButton />
      </S3Browser.Root>,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    // Upload button should not render when no upload config is provided
    expect(screen.queryByRole("button", { name: "Upload" })).toBeNull();
  });

  it("test UploadButton visible when upload config provided", async () => {
    render(
      <S3Browser.Root
        url="/api/browser"
        upload={{ endpoint: "testUploader", url: "/api/upload" }}
      >
        <S3Browser.UploadButton />
      </S3Browser.Root>,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    // Upload button should render when upload config is provided
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Upload" })).toBeTruthy();
    });
  });

  it("test UploadButton with custom label", async () => {
    render(
      <S3Browser.Root
        url="/api/browser"
        upload={{ endpoint: "testUploader", url: "/api/upload" }}
      >
        <S3Browser.UploadButton label="Add Files" />
      </S3Browser.Root>,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Add Files" })).toBeTruthy();
    });
  });

  it("test Toolbar shows upload button when upload config provided", async () => {
    render(
      <S3Browser.Root
        url="/api/browser"
        upload={{ endpoint: "testUploader", url: "/api/upload" }}
      >
        <S3Browser.Toolbar />
      </S3Browser.Root>,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    // The toolbar should auto-wire upload from context
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Upload" })).toBeTruthy();
    });
  });

  it("test Toolbar hides upload button when no upload config", async () => {
    render(
      <S3Browser.Root url="/api/browser">
        <S3Browser.Toolbar />
      </S3Browser.Root>,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    // The toolbar should not show upload button without upload config
    expect(screen.queryByRole("button", { name: "Upload" })).toBeNull();
  });
});
