import { forwardRef } from "react";
import { resolveStyle, resolveClassName, renderContent, cn } from "./shared";
import type { StyleField } from "./shared";
import { defaultProgressBarClasses, progressBarFillVariants } from "../styles";

// ─── Content Options ────────────────────────────────────────────────────────

export interface ProgressBarContentOpts {
  progress: number;
  isComplete: boolean;
  isIndeterminate: boolean;
}

// ─── Appearance ─────────────────────────────────────────────────────────────

export interface ProgressBarAppearance {
  container?: StyleField<ProgressBarContentOpts>;
  track?: StyleField<ProgressBarContentOpts>;
  fill?: StyleField<ProgressBarContentOpts>;
  label?: StyleField<ProgressBarContentOpts>;
}

// ─── Props ──────────────────────────────────────────────────────────────────

export interface ProgressBarProps {
  progress: number;
  showLabel?: boolean;
  labelFormat?: (progress: number) => string;
  indeterminate?: boolean;
  appearance?: ProgressBarAppearance;
  content?: {
    label?:
      | React.ReactNode
      | ((opts: ProgressBarContentOpts) => React.ReactNode);
  };
  className?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function defaultLabelFormat(progress: number): string {
  return `${Math.round(progress)}%`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  (props, ref) => {
    const {
      progress: rawProgress,
      showLabel = true,
      labelFormat = defaultLabelFormat,
      indeterminate = false,
      appearance,
      content,
      className,
    } = props;

    const progress = Math.max(0, Math.min(100, rawProgress));
    const isComplete = progress === 100 && !indeterminate;
    const isIndeterminate = indeterminate;

    const contentOpts: ProgressBarContentOpts = {
      progress,
      isComplete,
      isIndeterminate,
    };

    // Resolve styles
    const containerStyle = resolveStyle(appearance?.container, contentOpts);
    const containerClassName = cn(
      defaultProgressBarClasses.container,
      resolveClassName(appearance?.container, contentOpts),
    );

    const trackStyle = resolveStyle(appearance?.track, contentOpts);
    const trackClassName = cn(
      defaultProgressBarClasses.track,
      resolveClassName(appearance?.track, contentOpts),
    );

    const fillStyle = resolveStyle(appearance?.fill, contentOpts);
    const fillClassName = cn(
      progressBarFillVariants({ state: isComplete ? "complete" : "active" }),
      resolveClassName(appearance?.fill, contentOpts),
    );

    const labelStyle = resolveStyle(appearance?.label, contentOpts);
    const labelClassName = cn(
      defaultProgressBarClasses.label,
      resolveClassName(appearance?.label, contentOpts),
    );

    const dataState = isComplete
      ? "complete"
      : isIndeterminate
        ? "indeterminate"
        : "progress";

    // Build aria attributes
    const ariaProps: React.AriaAttributes & { role: string } = {
      role: "progressbar",
      "aria-valuemin": 0,
      "aria-valuemax": 100,
    };

    if (!isIndeterminate) {
      ariaProps["aria-valuenow"] = progress;
    }

    return (
      <div
        ref={ref}
        className={cn(className, containerClassName)}
        style={containerStyle}
        data-state={dataState}
      >
        <div className={trackClassName} style={trackStyle} {...ariaProps}>
          <div
            className={fillClassName}
            style={{
              ...fillStyle,
              width: isIndeterminate ? undefined : `${String(progress)}%`,
            }}
          />
        </div>

        {showLabel && (
          <div className={labelClassName} style={labelStyle}>
            {renderContent(content?.label, contentOpts, labelFormat(progress))}
          </div>
        )}
      </div>
    );
  },
);
ProgressBar.displayName = "ProgressBar";
