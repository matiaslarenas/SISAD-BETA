import {
  useEffect,
  useId,
  useRef,
} from "react";

function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousActiveElement =
      document.activeElement;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    const firstFocusable =
      dialogRef.current?.querySelector(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
      );

    firstFocusable?.focus();

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );

      previousActiveElement?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={
          description ? descriptionId : undefined
        }
      >
        <div className="modal-header">
          <div>
            <h3 id={titleId}>{title}</h3>

            {description ? (
              <p
                id={descriptionId}
                className="modal-description"
              >
                {description}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            className="mini-btn"
            onClick={onClose}
            aria-label={`Cerrar ${title}`}
          >
            ✕
          </button>
        </div>

        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;
