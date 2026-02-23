import { resolveStyle, resolveClassName, renderContent } from "./shared";
import type { StyleField } from "./shared";
import { defaultProgressBarStyles } from "../styles";

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
    label?: React.ReactNode | ((opts: ProgressBarContentOpts) => React.ReactNode);
  };
  className?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function defaultLabelFormat(progress: number): string {
  return `${Math.round(progress)}%`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ProgressBar(props: ProgressBarProps) {
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
  const containerStyle = resolveStyle(
    appearance?.container,
    contentOpts,
    defaultProgressBarStyles.container,
  );
  const containerClassName = resolveClassName(appearance?.container, contentOpts);

  const trackStyle = resolveStyle(
    appearance?.track,
    contentOpts,
    defaultProgressBarStyles.track,
  );
  const trackClassName = resolveClassName(appearance?.track, contentOpts);

  const fillDefaultStyle = isComplete
    ? defaultProgressBarStyles.fillComplete
    : defaultProgressBarStyles.fill;
  const fillStyle = resolveStyle(
    appearance?.fill,
    contentOpts,
    fillDefaultStyle,
  );
  const fillClassName = resolveClassName(appearance?.fill, contentOpts);

  const labelStyle = resolveStyle(
    appearance?.label,
    contentOpts,
    defaultProgressBarStyles.label,
  );
  const labelClassName = resolveClassName(appearance?.label, contentOpts);

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
      className={[className, containerClassName].filter(Boolean).join(" ") || undefined}
      style={containerStyle}
      data-state={dataState}
    >
      <div
        className={trackClassName}
        style={trackStyle}
        {...ariaProps}
      >
        <div
          className={fillClassName}
          style={{
            ...fillStyle,
            width: isIndeterminate ? undefined : `${String(progress)}%`,
          }}
        />
      </div>

      {showLabel && (
        <div
          className={labelClassName}
          style={labelStyle}
        >
          {renderContent(
            content?.label,
            contentOpts,
            labelFormat(progress),
          )}
        </div>
      )}
    </div>
  );
}
