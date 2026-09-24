export function SearchBar({
  classOptions,
  boardOptions,
  action,
}: {
  classOptions: string[];
  boardOptions: string[];
  action?: string;
}) {
  return (
    <form
      action={action}
      className="flex h-14 items-stretch overflow-hidden rounded-md border border-line-blue-strong bg-copy-white"
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
    </form>
  );
}
