/**
 * Native radio group styled as chips — the selected look comes from :checked, no JS.
 *
 * @status post-launch — Teacher of the Week nomination flow ships after the Delhi/
 * Gurugram launch scope (see docs/screen-map.md). Keep the component, but do not
 * import it from any route yet.
 */
export function NominationRelationshipChips({
  legend,
  name,
  options,
  defaultValue,
}: {
  legend: string;
  name: string;
  options: string[];
  defaultValue?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-body font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <label
            key={option}
            className="flex h-10 items-center rounded-full border border-line-blue px-3.5 text-body has-[:checked]:border-ruled-blue has-[:checked]:bg-pill-results-bg has-[:checked]:font-semibold has-[:checked]:text-ruled-blue"
          >
            <input
              type="radio"
              name={name}
              value={option}
              defaultChecked={option === defaultValue}
              className="sr-only"
            />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
