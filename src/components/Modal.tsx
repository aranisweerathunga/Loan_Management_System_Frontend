import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useBlocker } from "react-router-dom";
import { focusPreferred, useFocusTrap } from "@/lib/focusTrap";
import { cx } from "@/lib/cx";
import { Button } from "@/components/Button";

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children?: ReactNode;
  dirty?: boolean;
  busy?: boolean;
  size?: "sm" | "md" | "lg";
  footer?: ReactNode;
  submitLabel?: string;
  formId?: string;
};

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  dirty = false,
  busy = false,
  size = "sm",
  footer,
  submitLabel,
  formId,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [askDiscard, setAskDiscard] = useState(false);
  const blocker = useBlocker(open && dirty && !busy);

  function requestClose() {
    if (busy) return;
    if (askDiscard || blocker.state === "blocked") {
      keepEditing();
      return;
    }
    if (dirty) {
      setAskDiscard(true);
      return;
    }
    onClose();
  }

  function confirmDiscard() {
    setAskDiscard(false);
    if (blocker.state === "blocked") blocker.proceed();
    onClose();
  }

  function keepEditing() {
    setAskDiscard(false);
    if (blocker.state === "blocked") blocker.reset();
  }

  useFocusTrap(open, dialogRef, requestClose);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    focusPreferred(dialogRef.current);
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [open]);

  if (!open) return null;

  const discardVisible = askDiscard || blocker.state === "blocked";
  const defaultFooter =
    formId && submitLabel ? (
      <>
        <Button type="button" variant="secondary" onClick={requestClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" form={formId} loading={busy} loadingLabel="Saving…">
          {submitLabel}
        </Button>
      </>
    ) : null;

  return (
    <div className="modal-root">
      <button
        type="button"
        className="modal-backdrop"
        aria-label="Close dialog"
        onClick={requestClose}
      />
      <div
        ref={dialogRef}
        className={cx("modal", size === "md" && "modal--md", size === "lg" && "modal--lg")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        <header className="modal__header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description ? <p id={descriptionId}>{description}</p> : null}
          </div>
        </header>
        <div className="modal__body">
          {discardVisible ? (
            <div className="discard-banner" role="alert">
              <strong>Discard unsaved changes?</strong>
              <p>The information in this form has not been saved.</p>
              <div className="cluster">
                <Button type="button" variant="secondary" onClick={keepEditing}>
                  Keep editing
                </Button>
                <Button type="button" variant="danger" onClick={confirmDiscard}>
                  Discard changes
                </Button>
              </div>
            </div>
          ) : (
            children
          )}
        </div>
        {discardVisible ? null : footer || defaultFooter ? (
          <footer className="modal__footer">{footer ?? defaultFooter}</footer>
        ) : null}
      </div>
    </div>
  );
}
