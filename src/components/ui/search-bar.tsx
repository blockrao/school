import Form from "next/form";
import { FieldError, invalidFieldBorderClass } from "@/components/ui/field-error";
import { cn } from "@/lib/utils";

export function SearchBar({
  id,
  classOptions,
  boardOptions,
  action = "",
  error,
}: {
  id: string;
  classOptions: string[];
  boardOptions: string[];
  action?: string;
  error?: string;
}) {
  const errorId = `${id}-error`;

  return (
    <div>
      <Form
        action={action}
        className={cn(
          "flex h-14 items-stretch overflow-hidden rounded-md bg-copy-white",
          error ? invalidFieldBorderClass : "border border-line-blue-strong",
        )}
      >
        <label className="flex min-w-0 flex-[1.4] items-center gap-2 px-3">
          <span aria-hidden="true" className="text-slate">
            ⌕
          </span>
          <span className="sr-only">School name or area</span>
          <input
            type="search"
            name="q"
            placeholder="School name or area"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="w-full min-w-0 truncate bg-transparent text-body outline-none placeholder:text-slate"
          />
        </label>
        <label className="flex w-22 shrink-0 flex-col justify-center gap-0 border-l border-rule px-2.5">
          <span className="text-meta font-semibold text-muted-ink">Class</span>
          <select name="class" className="bg-transparent text-body outline-none" defaultValue="">
            <option value="">Any</option>
            {classOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="flex w-22 shrink-0 flex-col justify-center gap-0 border-l border-rule px-2.5">
          <span className="text-meta font-semibold text-muted-ink">Board</span>
          <select name="board" className="bg-transparent text-body outline-none" defaultValue="">
            <option value="">Any</option>
            {boardOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="flex items-center bg-ruled-blue px-4 font-semibold text-copy-white"
        >
          Search
        </button>
      </Form>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}
