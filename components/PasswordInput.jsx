"use client";

import { useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/*
A password field with a show/hide (eye) toggle. Renders the standard
`.input` with room for the icon, positioned absolutely so toggling causes
no layout shift. Each instance owns its own visibility state, so multiple
fields toggle independently. Toggling keeps focus on the input and restores
the caret position where the browser allows it. Autocomplete is passed
through unchanged.
*/

export default function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  required = true,
  wrapperClassName = "mt-1"
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  const toggle = () => {
    const el = ref.current;
    const start = el ? el.selectionStart : null;
    const end = el ? el.selectionEnd : null;

    setVisible((v) => !v);

    // Return focus to the input (the button stole it) and restore the caret
    // after the type flips. Some browsers don't expose selection on
    // type=password, so this is best-effort.
    requestAnimationFrame(() => {
      const input = ref.current;
      if (!input) return;
      input.focus();
      try {
        input.setSelectionRange(
          start ?? input.value.length,
          end ?? input.value.length
        );
      } catch {
        /* selection not supported for this input type */
      }
    });
  };

  return (
    <div className={`relative ${wrapperClassName}`}>
      <input
        id={id}
        ref={ref}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        required={required}
        value={value}
        onChange={onChange}
        className="input pr-11"
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 grid place-items-center h-8 w-8 rounded-md transition text-[color:var(--text-faint)] hover:text-[color:var(--text)] active:scale-95"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
