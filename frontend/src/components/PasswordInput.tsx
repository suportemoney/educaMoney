import { useId, useState } from "react";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
  id?: string;
};

function IconEye({ aberto }: { aberto: boolean }) {
  if (aberto) {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 5c-5 0-9.27 3.11-11 7 1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 .001 6.001A3 3 0 0 0 12 9z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 6a9.77 9.77 0 0 1 8.94 5.94 9.73 9.73 0 0 1-2.24 3.22l1.42 1.42-1.41 1.41-14-14 1.41-1.41 2.36 2.36A10.16 10.16 0 0 1 12 6zm0 12c-5 0-9.27-3.11-11-7a11.5 11.5 0 0 1 3.7-4.48l2.1 2.1A5 5 0 0 0 14.38 15l2.17 2.17A10.1 10.1 0 0 1 12 18zm-3.12-7.54 4.66 4.66a3 3 0 0 1-4.66-4.66z"
      />
    </svg>
  );
}

export function PasswordInput({
  label,
  value,
  onChange,
  autoComplete = "new-password",
  required,
  id,
}: Props) {
  const autoId = useId();
  const fieldId = id || autoId;
  const [visivel, setVisivel] = useState(false);

  return (
    <label className="field-pwd" htmlFor={fieldId}>
      <span>{label}</span>
      <span className="field-pwd__wrap">
        <input
          id={fieldId}
          type={visivel ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
        <button
          type="button"
          className="field-pwd__toggle"
          onClick={() => setVisivel((v) => !v)}
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
          title={visivel ? "Ocultar senha" : "Mostrar senha"}
        >
          <IconEye aberto={visivel} />
        </button>
      </span>
    </label>
  );
}
