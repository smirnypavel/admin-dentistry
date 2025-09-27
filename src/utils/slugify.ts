function transliterateCyrillicToLatin(s: string): string {
  // Basic transliteration for Ukrainian and Russian characters
  const map: Record<string, string> = {
    // Ukrainian
    а: "a",
    б: "b",
    в: "v",
    г: "h",
    ґ: "g",
    д: "d",
    е: "e",
    є: "ie",
    ж: "zh",
    з: "z",
    и: "y",
    і: "i",
    ї: "i",
    й: "i",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "kh",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "shch",
    ь: "",
    ю: "iu",
    я: "ia",
    // Russian additions
    ё: "e",
    ъ: "",
    ы: "y",
    э: "e",
  };
  return Array.from(s)
    .map((ch) => map[ch as keyof typeof map] ?? ch)
    .join("");
}

export function slugify(input: string): string {
  const pre = transliterateCyrillicToLatin(input.toLowerCase().trim());
  return pre
    .replace(/['’`]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
