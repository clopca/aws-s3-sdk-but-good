import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

import { ProgressBar } from "../components/progress-bar";

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("ProgressBar", () => {
  afterEach(() => {
    cleanup();
  });

  // ─── Basic Rendering ────────────────────────────────────────────────────

  it("test_renders_with_progress_50", () => {
    render(<ProgressBar progress={50} />);

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toBeTruthy();

    // Fill element should have width: 50%
    const fill = progressbar.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("50%");

    // Label should show "50%"
    expect(screen.getByText("50%")).toBeTruthy();
  });

  it("test_renders_with_progress_0", () => {
    render(<ProgressBar progress={0} />);

    const progressbar = screen.getByRole("progressbar");
    const fill = progressbar.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("0%");
    expect(screen.getByText("0%")).toBeTruthy();
  });

  it("test_renders_with_progress_100", () => {
    render(<ProgressBar progress={100} />);

    const progressbar = screen.getByRole("progressbar");
    const fill = progressbar.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("100%");
    expect(screen.getByText("100%")).toBeTruthy();
  });

  // ─── Progress Clamping ──────────────────────────────────────────────────

  it("test_clamps_progress_above_100", () => {
    render(<ProgressBar progress={150} />);

    const progressbar = screen.getByRole("progressbar");
    const fill = progressbar.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("100%");
    expect(progressbar.getAttribute("aria-valuenow")).toBe("100");
  });

  it("test_clamps_progress_below_0", () => {
    render(<ProgressBar progress={-20} />);

    const progressbar = screen.getByRole("progressbar");
    const fill = progressbar.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("0%");
    expect(progressbar.getAttribute("aria-valuenow")).toBe("0");
  });

  // ─── Accessibility ──────────────────────────────────────────────────────

  it("test_accessibility_attributes", () => {
    render(<ProgressBar progress={75} />);

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar.getAttribute("role")).toBe("progressbar");
    expect(progressbar.getAttribute("aria-valuenow")).toBe("75");
    expect(progressbar.getAttribute("aria-valuemin")).toBe("0");
    expect(progressbar.getAttribute("aria-valuemax")).toBe("100");
  });

  it("test_indeterminate_omits_aria_valuenow", () => {
    render(<ProgressBar progress={50} indeterminate />);

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar.getAttribute("aria-valuenow")).toBeNull();
    expect(progressbar.getAttribute("aria-valuemin")).toBe("0");
    expect(progressbar.getAttribute("aria-valuemax")).toBe("100");
  });

  // ─── Complete State ─────────────────────────────────────────────────────

  it("test_complete_state_uses_green_color", () => {
    render(<ProgressBar progress={100} />);

    const progressbar = screen.getByRole("progressbar");
    const fill = progressbar.firstElementChild as HTMLElement;
    expect(fill.className).toContain("bg-emerald-500");
  });

  it("test_incomplete_state_uses_blue_color", () => {
    render(<ProgressBar progress={50} />);

    const progressbar = screen.getByRole("progressbar");
    const fill = progressbar.firstElementChild as HTMLElement;
    expect(fill.className).toContain("bg-primary");
  });

  it("test_data_state_complete", () => {
    const { container } = render(<ProgressBar progress={100} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-state")).toBe("complete");
  });

  it("test_data_state_progress", () => {
    const { container } = render(<ProgressBar progress={50} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-state")).toBe("progress");
  });

  it("test_data_state_indeterminate", () => {
    const { container } = render(<ProgressBar progress={50} indeterminate />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-state")).toBe("indeterminate");
  });

  // ─── Custom Label Format ────────────────────────────────────────────────

  it("test_custom_label_format", () => {
    render(
      <ProgressBar
        progress={50}
        labelFormat={(p) => `${p}% done`}
      />,
    );

    expect(screen.getByText("50% done")).toBeTruthy();
  });

  // ─── Hidden Label ───────────────────────────────────────────────────────

  it("test_hidden_label", () => {
    render(<ProgressBar progress={50} showLabel={false} />);

    // The label text should not be present
    expect(screen.queryByText("50%")).toBeNull();
  });

  // ─── Theming Support ──────────────────────────────────────────────────

  it("test_appearance_fill_override", () => {
    render(
      <ProgressBar
        progress={50}
        appearance={{ fill: { backgroundColor: "red" } }}
      />,
    );

    const progressbar = screen.getByRole("progressbar");
    const fill = progressbar.firstElementChild as HTMLElement;
    expect(fill.style.backgroundColor).toBe("red");
  });

  it("test_appearance_container_classname", () => {
    const { container } = render(
      <ProgressBar
        progress={50}
        appearance={{ container: "my-container" }}
      />,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("my-container");
    // When a class name is used, inline styles should be skipped
    expect(root.style.display).toBe("");
  });

  it("test_appearance_function_style", () => {
    render(
      <ProgressBar
        progress={100}
        appearance={{
          fill: (opts) =>
            opts.isComplete
              ? { backgroundColor: "gold" }
              : { backgroundColor: "silver" },
        }}
      />,
    );

    const progressbar = screen.getByRole("progressbar");
    const fill = progressbar.firstElementChild as HTMLElement;
    expect(fill.style.backgroundColor).toBe("gold");
  });

  // ─── Custom Content ─────────────────────────────────────────────────────

  it("test_custom_label_content_string", () => {
    render(
      <ProgressBar
        progress={50}
        content={{ label: "Loading..." }}
      />,
    );

    expect(screen.getByText("Loading...")).toBeTruthy();
  });

  it("test_custom_label_content_function", () => {
    render(
      <ProgressBar
        progress={75}
        content={{
          label: (opts) =>
            opts.isComplete ? "Done!" : `${opts.progress}% uploading`,
        }}
      />,
    );

    expect(screen.getByText("75% uploading")).toBeTruthy();
  });

  // ─── className Prop ───────────────────────────────────────────────────

  it("test_classname_prop", () => {
    const { container } = render(
      <ProgressBar progress={50} className="my-progress" />,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("my-progress");
  });
});
