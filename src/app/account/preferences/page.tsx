"use client";

import { FormEvent, useEffect, useState } from "react";
import type { UserPreferences } from "@/lib/account/profile";

const STYLE_OPTIONS = ["minimal", "modern", "classic", "bold", "elegant", "playful"];
const COLOUR_OPTIONS = ["earth", "forest", "ocean", "monochrome", "warm", "cool"];
const EXPORT_OPTIONS = ["svg", "png", "icon", "horizontal", "stacked", "monochrome"];

export default function AccountPreferencesPage() {
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/account/preferences");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not load preferences");
        return;
      }
      setPrefs(json.preferences);
    })();
  }, []);

  function toggle(list: string[], value: string) {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!prefs) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/account/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        defaultLogoStyles: prefs.default_logo_styles,
        preferredColourDirections: prefs.preferred_colour_directions,
        defaultExportFormats: prefs.default_export_formats,
        emailProductUpdates: prefs.email_product_updates,
        emailMarketing: prefs.email_marketing,
        reduceMotion: prefs.reduce_motion,
        highContrast: prefs.high_contrast,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(json.error ?? "Could not save preferences");
      return;
    }
    setPrefs(json.preferences);
    setMessage(json.message ?? "Preferences saved.");
  }

  if (!prefs) return <p className="text-black/60">{error ?? "Loading preferences…"}</p>;

  return (
    <form className="panel space-y-6 rounded-3xl p-6" onSubmit={onSave} data-testid="preferences-form">
      <fieldset>
        <legend className="text-lg font-medium">Default logo styles</legend>
        <div className="mt-3 flex flex-wrap gap-3">
          {STYLE_OPTIONS.map((style) => (
            <label key={style} className="flex items-center gap-2 text-sm capitalize">
              <input
                type="checkbox"
                checked={prefs.default_logo_styles.includes(style)}
                onChange={() =>
                  setPrefs({
                    ...prefs,
                    default_logo_styles: toggle(prefs.default_logo_styles, style),
                  })
                }
              />
              {style}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-lg font-medium">Preferred colour directions</legend>
        <div className="mt-3 flex flex-wrap gap-3">
          {COLOUR_OPTIONS.map((colour) => (
            <label key={colour} className="flex items-center gap-2 text-sm capitalize">
              <input
                type="checkbox"
                checked={prefs.preferred_colour_directions.includes(colour)}
                onChange={() =>
                  setPrefs({
                    ...prefs,
                    preferred_colour_directions: toggle(prefs.preferred_colour_directions, colour),
                  })
                }
              />
              {colour}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-lg font-medium">Default export formats</legend>
        <div className="mt-3 flex flex-wrap gap-3">
          {EXPORT_OPTIONS.map((format) => (
            <label key={format} className="flex items-center gap-2 text-sm uppercase">
              <input
                type="checkbox"
                checked={prefs.default_export_formats.includes(format)}
                onChange={() =>
                  setPrefs({
                    ...prefs,
                    default_export_formats: toggle(prefs.default_export_formats, format),
                  })
                }
              />
              {format}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-lg font-medium">Email notifications</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={prefs.email_product_updates}
            onChange={(e) => setPrefs({ ...prefs, email_product_updates: e.target.checked })}
          />
          Product updates and account notices
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={prefs.email_marketing}
            onChange={(e) => setPrefs({ ...prefs, email_marketing: e.target.checked })}
          />
          Marketing emails (optional)
        </label>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-lg font-medium">Accessibility</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={prefs.reduce_motion}
            onChange={(e) => setPrefs({ ...prefs, reduce_motion: e.target.checked })}
          />
          Prefer reduced motion
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={prefs.high_contrast}
            onChange={(e) => setPrefs({ ...prefs, high_contrast: e.target.checked })}
          />
          Prefer higher contrast
        </label>
        <p className="text-xs text-black/55">
          Preferences are saved to your account. Full UI application of motion/contrast preferences
          is progressive.
        </p>
      </fieldset>

      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-[var(--forest-deep)]" role="status">
          {message}
        </p>
      ) : null}

      <button className="btn btn-primary" disabled={saving} type="submit">
        {saving ? "Saving…" : "Save preferences"}
      </button>
    </form>
  );
}
