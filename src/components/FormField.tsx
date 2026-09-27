import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

type ControlProps = {
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  "aria-required"?: boolean;
};

type FormFieldProps = {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactElement<ControlProps>;
};

export function FormField({
  id,
  label,
  required,
  hint,
  error,
  className,
  children,
}: FormFieldProps) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ");
  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy || undefined,
        "aria-required": required || undefined,
      })
    : children;

  return (
    <div className={className ? `field ${className}` : "field"}>
      <label className="field__label" htmlFor={id}>
        {label}
        {required ? (
          <span className="required-mark">
            <span aria-hidden="true"> *</span>
            <span className="visually-hidden"> required</span>
          </span>
        ) : null}
      </label>
      {control}
      {hint ? (
        <p className="field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="field__error" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function CheckField({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="check">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        {label}
        {hint ? <span className="field__hint"> {hint}</span> : null}
      </span>
    </label>
  );
}

export function FieldHint({ children }: { children: ReactNode }) {
  return <p className="muted">{children}</p>;
}
