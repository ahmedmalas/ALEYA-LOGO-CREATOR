"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

type Props = {
  name: string;
  label: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  helpText?: string;
};

export function PasswordField({
  name,
  label,
  autoComplete = "current-password",
  required = true,
  minLength = 8,
  helpText,
}: Props) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  const helpId = helpText ? `${id}-help` : undefined;

  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <span className="relative block">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          aria-describedby={helpId}
          className="w-full pr-12"
        />
        <button
          type="button"
          className="absolute inset-y-0 right-2 my-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--forest)] hover:bg-[rgba(31,77,69,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--forest)]"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
        </button>
      </span>
      {helpText ? (
        <span id={helpId} className="text-xs text-black/55">
          {helpText}
        </span>
      ) : null}
    </label>
  );
}
