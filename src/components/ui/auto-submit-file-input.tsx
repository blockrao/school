"use client";

/** A file input that submits its form the moment a file is picked — no separate "Upload" click needed. */
export function AutoSubmitFileInput({
  name,
  accept,
  className,
  children,
}: {
  name: string;
  accept?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={className}>
      {children}
      <input
        type="file"
        name={name}
        accept={accept}
        required
        className="sr-only"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      />
    </label>
  );
}
