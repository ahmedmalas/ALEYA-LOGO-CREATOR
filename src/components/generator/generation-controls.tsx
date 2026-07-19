"use client";

import {
  GENERATION_MODES,
  STYLE_DIRECTIONS,
  defaultGenerationControls,
  type GenerationControls,
  type GenerationMode,
  type StyleDirection,
} from "@/lib/logo/evolution";

const MODE_COPY: Record<GenerationMode, string> = {
  mirror:
    "Recreate the reference faithfully. Clean up quality without inventing a different logo.",
  refine:
    "Keep the same recognisable identity. Improve spacing, typography, geometry and production quality.",
  advance:
    "Evolve the brand DNA into a modern premium mark while staying recognisable.",
  explore:
    "Broader creative directions inspired by the reference design language.",
};

type Props = {
  value: GenerationControls;
  onChange: (next: GenerationControls) => void;
  disabled?: boolean;
};

function Slider({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="field">
      <span className="flex justify-between text-xs">
        <span>{label}</span>
        <span className="tabular-nums text-black/50">{value}</span>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

export function GenerationControlsPanel({ value, onChange, disabled }: Props) {
  function patch(partial: Partial<GenerationControls>) {
    if (partial.mode && partial.mode !== value.mode) {
      onChange(defaultGenerationControls({ ...value, ...partial, mode: partial.mode }));
      return;
    }
    onChange({ ...value, ...partial });
  }

  return (
    <section className="panel space-y-4 rounded-3xl p-5 md:p-6" data-testid="generation-controls">
      <div>
        <h2 className="text-xl">Evolution controls</h2>
        <p className="mt-1 text-sm text-black/60">
          Choose how tightly generation should follow your confirmed reference analysis.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup" aria-label="Generation mode">
        {GENERATION_MODES.map((mode) => {
          const active = value.mode === mode;
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              data-mode={mode}
              className={`rounded-2xl border px-3 py-3 text-left transition ${
                active
                  ? "border-[var(--forest)] bg-[rgba(31,77,69,0.1)]"
                  : "border-black/10 bg-white/60 hover:border-black/20"
              }`}
              onClick={() => patch({ mode })}
            >
              <span className="block text-sm font-semibold capitalize">{mode}</span>
              <span className="mt-1 block text-xs text-black/55">{MODE_COPY[mode]}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Slider
          label="Similarity to reference"
          value={value.similarity}
          disabled={disabled}
          onChange={(similarity) => patch({ similarity })}
        />
        <Slider
          label="Creativity"
          value={value.creativity}
          disabled={disabled}
          onChange={(creativity) => patch({ creativity })}
        />
        <Slider
          label="Modernisation strength"
          value={value.modernisation}
          disabled={disabled}
          onChange={(modernisation) => patch({ modernisation })}
        />
        <Slider
          label="Simplification strength"
          value={value.simplification}
          disabled={disabled}
          onChange={(simplification) => patch({ simplification })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Toggle
          label="Preserve symbol"
          checked={value.preserveSymbol}
          disabled={disabled}
          onChange={(preserveSymbol) => patch({ preserveSymbol })}
        />
        <Toggle
          label="Preserve typography style"
          checked={value.preserveTypography}
          disabled={disabled}
          onChange={(preserveTypography) => patch({ preserveTypography })}
        />
        <Toggle
          label="Preserve colours"
          checked={value.preserveColours}
          disabled={disabled}
          onChange={(preserveColours) => patch({ preserveColours })}
        />
        <Toggle
          label="Preserve layout"
          checked={value.preserveLayout}
          disabled={disabled}
          onChange={(preserveLayout) => patch({ preserveLayout })}
        />
        <Toggle
          label="Premium / luxury direction"
          checked={value.premiumDirection}
          disabled={disabled}
          onChange={(premiumDirection) => patch({ premiumDirection })}
        />
      </div>

      <label className="field">
        <span className="text-xs">Style direction</span>
        <select
          value={value.styleDirection}
          disabled={disabled}
          onChange={(e) => patch({ styleDirection: e.target.value as StyleDirection })}
        >
          {STYLE_DIRECTIONS.map((dir) => (
            <option key={dir} value={dir}>
              {dir}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="text-xs">Exact logo text</span>
        <input
          value={value.exactLogoText}
          disabled={disabled}
          onChange={(e) => patch({ exactLogoText: e.target.value })}
          placeholder="Must match the reference spelling"
        />
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="field">
          <span className="text-xs">Elements that must not change</span>
          <textarea
            rows={2}
            value={value.mustNotChange}
            disabled={disabled}
            onChange={(e) => patch({ mustNotChange: e.target.value })}
            placeholder="Symbol silhouette, wordmark casing, primary green…"
          />
        </label>
        <label className="field">
          <span className="text-xs">Elements to improve</span>
          <textarea
            rows={2}
            value={value.improve}
            disabled={disabled}
            onChange={(e) => patch({ improve: e.target.value })}
            placeholder="Kerning, uneven strokes, low contrast…"
          />
        </label>
      </div>
    </section>
  );
}
