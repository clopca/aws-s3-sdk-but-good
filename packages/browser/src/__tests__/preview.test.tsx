import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPreviewComponent, PreviewModal } from "../components";
import ImagePreview from "../components/preview/image-preview";
import VideoPreview from "../components/preview/video-preview";
import AudioPreview from "../components/preview/audio-preview";
import PdfPreview from "../components/preview/pdf-preview";
import CodePreview from "../components/preview/code-preview";
import JsonPreview from "../components/preview/json-preview";
import CsvPreview from "../components/preview/csv-preview";
import TextPreview from "../components/preview/text-preview";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

describe("preview components", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(""));
  });

  it("test_getPreviewComponent_mapping", () => {
    expect(getPreviewComponent("image")).toBeTruthy();
    expect(getPreviewComponent("video")).toBeTruthy();
    expect(getPreviewComponent("unknown")).toBeNull();
  });

  it("test_basic_renderers", () => {
    const { container } = render(
      <ImagePreview
        url="https://img"
        fileName="a.png"
        contentType="image/png"
      />,
    );
    expect(container.querySelector("img")).toBeTruthy();

    const video = render(
      <VideoPreview
        url="https://video"
        fileName="a.mp4"
        contentType="video/mp4"
      />,
    );
    expect(video.container.querySelector("video")).toBeTruthy();

    const audio = render(
      <AudioPreview
        url="https://audio"
        fileName="a.mp3"
        contentType="audio/mpeg"
      />,
    );
    expect(audio.container.querySelector("audio")).toBeTruthy();

    const pdf = render(
      <PdfPreview
        url="https://pdf"
        fileName="a.pdf"
        contentType="application/pdf"
      />,
    );
    expect(pdf.container.querySelector("iframe")).toBeTruthy();
  });

  it("test_fetch_based_renderers", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("const a = 1;"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true })))
      .mockResolvedValueOnce(new Response("a,b\n1,2"))
      .mockResolvedValueOnce(new Response("plain text"));

    render(
      <CodePreview
        url="https://code"
        fileName="a.ts"
        contentType="text/plain"
      />,
    );
    await waitFor(() => expect(screen.getByText("const a = 1;")).toBeTruthy());

    render(
      <JsonPreview
        url="https://json"
        fileName="a.json"
        contentType="application/json"
      />,
    );
    await waitFor(() => expect(screen.getByText(/"ok": true/)).toBeTruthy());

    render(
      <CsvPreview url="https://csv" fileName="a.csv" contentType="text/csv" />,
    );
    await waitFor(() => expect(screen.getByText("a")).toBeTruthy());

    render(
      <TextPreview
        url="https://txt"
        fileName="a.txt"
        contentType="text/plain"
      />,
    );
    await waitFor(() => expect(screen.getByText("plain text")).toBeTruthy());
  });

  it("test_PreviewModal_interactions", async () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const onClose = vi.fn();
    const onDownload = vi.fn();

    render(
      <PreviewModal
        file={{
          kind: "file",
          key: "a.txt",
          name: "a.txt",
          size: 100,
          lastModified: new Date(),
          contentType: "text/plain",
        }}
        url="https://txt"
        isLoading={false}
        onPrev={onPrev}
        onNext={onNext}
        onClose={onClose}
        onDownload={onDownload}
        hasPrev
        hasNext
      />,
    );

    fireEvent.keyDown(document, { key: "ArrowLeft" });
    fireEvent.keyDown(document, { key: "ArrowRight" });
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onPrev).toHaveBeenCalled();
    expect(onNext).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    expect(onDownload).toHaveBeenCalled();
  });
});
