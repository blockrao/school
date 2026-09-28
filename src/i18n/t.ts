import type { Dictionary } from "@/i18n/dictionary";

// Hindi-readiness checklist item 1 (2026-09-28): the one function every
// user-facing string goes through. Pure and dependency-free on purpose so it
// works the same in Server and Client Components — a Client Component gets
// its `Dictionary` as a prop from the nearest server parent (same pattern
// already used for `locale`/`areas`), rather than importing the JSON itself.

type Primitive = string | number;
type Vars = Record<string, Primitive>;

/** Dot-separated paths into Dictionary whose leaf is a string, e.g. "nav.schools". */
type StringPaths<T, Prefix extends string = ""> = T extends string
  ? Prefix
  : T extends Record<string, unknown>
    ? {
        [K in keyof T & string]: StringPaths<T[K], `${Prefix}${Prefix extends "" ? "" : "."}${K}`>;
      }[keyof T & string]
    : never;

export type TranslationKey = StringPaths<Dictionary>;

/**
 * Dot-separated paths whose leaf is a plural-forms object (has a required
 * "other" key — CLDR requires every language's plural rules to include
 * "other", so it's the one key every set of plural forms is guaranteed to
 * have). Stops recursing as soon as a node matches, same as StringPaths
 * stopping at a string — a plural-forms object is a leaf, not a namespace to
 * descend into.
 */
type PluralPaths<T, Prefix extends string = ""> = T extends { other: string }
  ? Prefix
  : T extends Record<string, unknown>
    ? {
        [K in keyof T & string]: PluralPaths<T[K], `${Prefix}${Prefix extends "" ? "" : "."}${K}`>;
      }[keyof T & string]
    : never;

export type PluralKey = PluralPaths<Dictionary>;

function readPath(dict: Dictionary, path: string): unknown {
  return path.split(".").reduce<unknown>((node, segment) => {
    if (node && typeof node === "object" && segment in (node as Record<string, unknown>)) {
      return (node as Record<string, unknown>)[segment];
    }
    return undefined;
  }, dict);
}

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

/**
 * t('nav.schools') — dictionary lookup + `{placeholder}` interpolation. Never
 * concatenate translated fragments with `+`; pass every variable part as a
 * named placeholder instead, since word order isn't the same across
 * languages. Falls back to the raw key (loud enough to notice in dev, never
 * a thrown error that would take down a page over a missing string).
 */
export function t(dict: Dictionary, key: TranslationKey, vars?: Vars): string {
  const value = readPath(dict, key);
  if (typeof value !== "string") {
    if (process.env.NODE_ENV !== "production") {
      console.error(`[i18n] missing or non-string key: "${key}"`);
    }
    return key;
  }
  return interpolate(value, vars);
}

type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>>;

/**
 * tPlural('results.school_count', 3) — picks the CLDR plural category via
 * Intl.PluralRules for the dictionary's own locale (not hard-coded English
 * "count === 1"), so a language with more plural categories than English
 * (Hindi still only needs one/other, but this doesn't assume that) works
 * without changing call sites.
 */
export function tPlural(
  dict: Dictionary,
  key: PluralKey,
  count: number,
  vars?: Vars,
  locale = "en",
): string {
  const forms = readPath(dict, key) as PluralForms | undefined;
  if (!forms || typeof forms !== "object") {
    if (process.env.NODE_ENV !== "production") {
      console.error(`[i18n] missing plural key: "${key}"`);
    }
    return key;
  }
  const category = new Intl.PluralRules(locale).select(count);
  const template = forms[category] ?? forms.other ?? Object.values(forms)[0];
  if (!template) return key;
  return interpolate(template, { count, ...vars });
}

/** Enum namespaces in the dictionary — see `enum.*` in locales/en.json. */
type EnumGroup = keyof Dictionary["enum"];

/**
 * tEnum(dict, "management", school.management) — label lookup for a DB code
 * (checklist item 2: enums are stored as codes; this is the one place that
 * maps a code to display text). Unlike `t()`, the code itself is a runtime
 * value, not a string literal, so this can't be typed against a fixed key
 * union — instead it falls back to the raw code for anything unmapped
 * (a schema value newer than the dictionary), which is a safer failure than
 * a blank field or a thrown error.
 */
export function tEnum(dict: Dictionary, group: EnumGroup, code: string | null | undefined): string {
  if (!code) return code ?? "";
  const forms = dict.enum[group] as Record<string, string>;
  return forms[code] ?? code;
}
