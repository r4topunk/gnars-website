export const THEME_VALUES = ["light", "dark", "system"] as const;

export type ThemeValue = (typeof THEME_VALUES)[number];

export const THEME_OPTIONS = THEME_VALUES.map((value) => ({
  value,
  label: `${value.charAt(0).toUpperCase()}${value.slice(1)}`,
})) as ReadonlyArray<{ value: ThemeValue; label: string }>;

export function isThemeValue(value: string | null): value is ThemeValue {
  if (!value) {
    return false;
  }
  return (THEME_VALUES as readonly string[]).includes(value);
}
