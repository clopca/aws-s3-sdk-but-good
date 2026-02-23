import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

  it("renders toolbar and bucket selector and fetches list", async () => {
    render(
      <S3Browser
        url="/api/browser"
        config={{ buckets: ["bucket-a", "bucket-b"], defaultBucket: "bucket-a" }}
      />,
    );

    expect(screen.getByRole("button", { name: "Grid" })).toBeTruthy();
    expect(screen.getByText("Bucket: bucket-a")).toBeTruthy();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
  });
});
