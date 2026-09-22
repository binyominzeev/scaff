/**
 * Curated catalog of 20 visual "looks" (design.look) and 20 "layout archetypes"
 * (design.components) that a .projectspec.md front matter can reference to vary the
 * generated UI's appearance. See README.md ("Design looks & layout archetypes") for
 * the human-readable implemented/fallback status table — keep that table in sync
 * with the `implemented` flags below whenever this file changes.
 */

/** Two-level deep merge: overrides a nested token group without needing to restate every key. */
function mergeTokens(base, overrides = {}) {
  const result = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    result[key] = value && typeof value === "object" && !Array.isArray(value)
      ? { ...base[key], ...value }
      : value;
  }
  return result;
}

/**
 * The literal current hardcoded style (slate palette, rounded-md/lg, shadow-sm,
 * sans-serif) — this is what every scaffold got before `design.look` existed, and
 * what "minimal-mono" resolves to, so an omitted `design.look` produces byte-identical
 * output to pre-design-catalog scaffolds.
 */
const BASE_TOKENS = {
  font: "font-sans",
  palette: {
    textPrimary: "text-slate-900",
    textSecondary: "text-slate-700",
    textMuted: "text-slate-500",
    border: "border-slate-200",
    fieldBorder: "border-slate-300",
    focusBorder: "focus:border-slate-500",
    headerBg: "bg-slate-50",
    hoverRow: "hover:bg-slate-50",
    surface: "bg-white",
  },
  radius: "rounded-md",
  radiusLg: "rounded-lg",
  radiusXl: "rounded-xl",
  shadow: "shadow-sm",
  button: {
    base: "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50",
    primary: "bg-slate-900 text-white hover:bg-slate-700",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
    danger: "bg-red-600 text-white hover:bg-red-500",
  },
  field: {
    input: "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none",
    label: "text-xs font-semibold uppercase tracking-wide text-slate-500",
  },
  table: {
    wrapper: "overflow-x-auto rounded-lg border border-slate-200",
    headerCell: "px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500",
    headerBg: "bg-slate-50",
    row: "hover:bg-slate-50",
    cell: "px-4 py-2 text-slate-800",
    cellLink: "font-medium text-slate-900 hover:underline",
  },
  list: {
    wrapper: "mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200",
    dt: "font-medium text-slate-500",
    dd: "text-slate-900",
  },
  interactiveList: {
    card: "mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm",
    primaryText: "text-lg font-medium text-slate-900",
    secondaryText: "mt-4 text-slate-700",
    revealButton: "rounded-md bg-slate-900 px-4 py-2 text-sm text-white",
    nextButton: "rounded-md border border-slate-300 px-4 py-2 text-sm",
    counter: "mt-3 text-xs text-slate-500",
  },
  card: {
    wrapper: "rounded-xl border border-slate-200 bg-white p-6 shadow-sm",
  },
  nav: {
    bar: "border-b border-slate-200 bg-white",
    brand: "text-base font-semibold tracking-tight text-slate-900",
    linksWrap: "flex flex-1 items-center gap-6 text-sm font-medium text-slate-600",
    linkHover: "hover:text-slate-900",
  },
  heading: {
    h1: "text-3xl font-bold tracking-tight",
    formH1: "text-2xl font-bold",
    h2: "mt-8 text-lg font-semibold text-slate-900",
  },
  text: {
    body: "mt-2 text-slate-600",
    muted: "text-sm text-slate-500",
    link: "text-sm text-slate-600 hover:underline",
    danger: "text-red-600",
  },
  container: {
    page: "p-8",
    narrow: "mx-auto max-w-lg p-8",
  },
};

function look(id, label, description, overrides) {
  return { id, label, description, tokens: mergeTokens(BASE_TOKENS, overrides) };
}

export const DESIGN_LOOKS = [
  look("minimal-mono", "Minimal Mono",
    "Restrained monochrome palette, generous whitespace, sharp/barely-rounded corners, sans-serif throughout."),

  look("playful-cards", "Playful Cards",
    "Rounded cards, saturated pastel accents, friendly icons/badges, soft shadows.",
    {
      radius: "rounded-xl", radiusLg: "rounded-2xl", radiusXl: "rounded-3xl", shadow: "shadow-md",
      palette: { textPrimary: "text-rose-950", textSecondary: "text-rose-800", textMuted: "text-rose-400", border: "border-rose-200", fieldBorder: "border-rose-300", focusBorder: "focus:border-rose-500", headerBg: "bg-rose-50", hoverRow: "hover:bg-rose-50", surface: "bg-white" },
      button: { base: "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50", primary: "bg-rose-500 text-white hover:bg-rose-400", ghost: "bg-rose-50 text-rose-700 hover:bg-rose-100", danger: "bg-red-500 text-white hover:bg-red-400" },
      field: { input: "rounded-xl border border-rose-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none", label: "text-xs font-semibold uppercase tracking-wide text-rose-400" },
      nav: { bar: "border-b border-rose-200 bg-white", brand: "text-base font-semibold tracking-tight text-rose-950", linksWrap: "flex flex-1 items-center gap-6 text-sm font-medium text-rose-700", linkHover: "hover:text-rose-950" },
      heading: { h1: "text-3xl font-extrabold tracking-tight text-rose-950", formH1: "text-2xl font-extrabold text-rose-950", h2: "mt-8 text-lg font-semibold text-rose-900" },
    }),

  look("editorial-serif", "Editorial Serif",
    "Serif/mixed typography, narrow reading column, minimal chrome, content-first.",
    {
      font: "font-serif", shadow: "shadow-none",
      palette: { textPrimary: "text-stone-900", textSecondary: "text-stone-700", textMuted: "text-stone-500", border: "border-stone-300", fieldBorder: "border-stone-400", focusBorder: "focus:border-stone-600", headerBg: "bg-stone-100", hoverRow: "hover:bg-stone-50", surface: "bg-white" },
      button: { primary: "bg-stone-900 text-white hover:bg-stone-700", ghost: "bg-transparent text-stone-700 hover:bg-stone-100" },
      heading: { h1: "font-serif text-4xl font-bold tracking-tight text-stone-900", formH1: "font-serif text-2xl font-bold text-stone-900", h2: "mt-8 font-serif text-xl font-semibold text-stone-900" },
      container: { page: "mx-auto max-w-2xl p-8", narrow: "mx-auto max-w-lg p-8" },
    }),

  look("dense-dashboard", "Dense Dashboard",
    "Tight spacing, small type, high information density, table-centric.",
    {
      radius: "rounded-sm", radiusLg: "rounded-md", radiusXl: "rounded-md", shadow: "shadow-none",
      palette: { textPrimary: "text-slate-900", textSecondary: "text-slate-600", textMuted: "text-slate-400", border: "border-slate-200", headerBg: "bg-slate-100", hoverRow: "hover:bg-slate-100" },
      heading: { h1: "text-xl font-bold tracking-tight", formH1: "text-lg font-bold", h2: "mt-4 text-sm font-semibold uppercase tracking-wide text-slate-500" },
      container: { page: "p-4", narrow: "mx-auto max-w-md p-4" },
    }),

  look("warm-community", "Warm Community",
    "Warm palette, avatar-forward, larger touch targets, human-centered layout.",
    {
      radius: "rounded-full", radiusLg: "rounded-2xl", radiusXl: "rounded-2xl", shadow: "shadow-md",
      palette: { textPrimary: "text-amber-950", textSecondary: "text-amber-800", textMuted: "text-amber-600", border: "border-amber-200", fieldBorder: "border-amber-300", focusBorder: "focus:border-amber-500", headerBg: "bg-amber-50", hoverRow: "hover:bg-amber-50", surface: "bg-white" },
      button: { base: "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50", primary: "bg-amber-600 text-white hover:bg-amber-500", ghost: "bg-amber-50 text-amber-800 hover:bg-amber-100", danger: "bg-red-500 text-white hover:bg-red-400" },
      nav: { bar: "border-b border-amber-200 bg-amber-50", brand: "text-base font-semibold tracking-tight text-amber-950", linksWrap: "flex flex-1 items-center gap-6 text-sm font-medium text-amber-800", linkHover: "hover:text-amber-950" },
    }),

  look("brutalist-raw", "Brutalist Raw",
    "Unstyled borders, harsh contrast, exposed grid lines, deliberately unpolished.",
    {
      radius: "rounded-none", radiusLg: "rounded-none", radiusXl: "rounded-none", shadow: "shadow-none",
      palette: { textPrimary: "text-black", textSecondary: "text-black", textMuted: "text-neutral-600", border: "border-black", fieldBorder: "border-black", focusBorder: "focus:border-black", headerBg: "bg-black", hoverRow: "hover:bg-yellow-100", surface: "bg-white" },
      button: { base: "inline-flex items-center justify-center rounded-none border-2 border-black px-4 py-2 text-sm font-bold uppercase transition-colors disabled:opacity-50", primary: "bg-black text-white hover:bg-yellow-300 hover:text-black", ghost: "bg-white text-black hover:bg-neutral-100", danger: "bg-red-600 text-white hover:bg-red-500" },
      field: { input: "rounded-none border-2 border-black px-3 py-2 text-sm focus:outline-none", label: "text-xs font-bold uppercase tracking-wide text-black" },
      table: { wrapper: "overflow-x-auto rounded-none border-2 border-black", headerCell: "px-4 py-2 text-left text-xs font-bold uppercase tracking-wide text-white", headerBg: "bg-black", row: "hover:bg-yellow-100", cell: "px-4 py-2 text-black", cellLink: "font-bold text-black underline" },
      nav: { bar: "border-b-2 border-black bg-white", brand: "text-base font-bold uppercase tracking-tight text-black", linksWrap: "flex flex-1 items-center gap-6 text-sm font-bold uppercase text-black", linkHover: "hover:underline" },
      heading: { h1: "text-3xl font-black uppercase tracking-tight text-black", formH1: "text-2xl font-black uppercase text-black", h2: "mt-8 text-lg font-black uppercase text-black" },
    }),

  look("glassmorphic", "Glassmorphic",
    "Frosted translucent panels, background blur, soft gradients, layered depth.",
    {
      radius: "rounded-2xl", radiusLg: "rounded-2xl", radiusXl: "rounded-3xl", shadow: "shadow-xl",
      palette: { textPrimary: "text-indigo-950", textSecondary: "text-indigo-800", textMuted: "text-indigo-400", border: "border-white/40", fieldBorder: "border-white/50", focusBorder: "focus:border-indigo-400", headerBg: "bg-white/40", hoverRow: "hover:bg-white/50", surface: "bg-white/60 backdrop-blur-md" },
      button: { primary: "bg-indigo-600/90 text-white backdrop-blur hover:bg-indigo-500/90", ghost: "bg-white/40 text-indigo-800 backdrop-blur hover:bg-white/60", danger: "bg-red-500/90 text-white hover:bg-red-400/90" },
      card: { wrapper: "rounded-3xl border border-white/40 bg-white/50 p-6 shadow-xl backdrop-blur-md" },
      interactiveList: { card: "mt-6 rounded-2xl border border-white/40 bg-white/50 p-6 shadow-xl backdrop-blur-md", primaryText: "text-lg font-medium text-indigo-950", secondaryText: "mt-4 text-indigo-800", revealButton: "rounded-2xl bg-indigo-600/90 px-4 py-2 text-sm text-white backdrop-blur", nextButton: "rounded-2xl border border-white/50 bg-white/40 px-4 py-2 text-sm backdrop-blur", counter: "mt-3 text-xs text-indigo-400" },
      nav: { bar: "border-b border-white/40 bg-white/40 backdrop-blur-md", brand: "text-base font-semibold tracking-tight text-indigo-950", linksWrap: "flex flex-1 items-center gap-6 text-sm font-medium text-indigo-800", linkHover: "hover:text-indigo-950" },
    }),

  look("dark-terminal", "Dark Terminal",
    "Dark background, monospace accents, neon/muted-green highlights, developer-tool feel.",
    {
      font: "font-mono", radius: "rounded-sm", radiusLg: "rounded-md", radiusXl: "rounded-md", shadow: "shadow-none",
      palette: { textPrimary: "text-emerald-300", textSecondary: "text-emerald-400", textMuted: "text-emerald-600", border: "border-emerald-900", fieldBorder: "border-emerald-800", focusBorder: "focus:border-emerald-400", headerBg: "bg-neutral-900", hoverRow: "hover:bg-neutral-900", surface: "bg-neutral-950" },
      button: { base: "inline-flex items-center justify-center rounded-sm border border-emerald-700 px-4 py-2 text-sm font-semibold font-mono transition-colors disabled:opacity-50", primary: "bg-emerald-500 text-neutral-950 hover:bg-emerald-400", ghost: "bg-neutral-900 text-emerald-300 hover:bg-neutral-800", danger: "bg-red-600 text-white hover:bg-red-500" },
      field: { input: "rounded-sm border border-emerald-800 bg-neutral-950 px-3 py-2 text-sm text-emerald-300 focus:border-emerald-400 focus:outline-none", label: "text-xs font-semibold uppercase tracking-wide text-emerald-600" },
      table: { wrapper: "overflow-x-auto rounded-sm border border-emerald-900 bg-neutral-950", headerCell: "px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-emerald-500", headerBg: "bg-neutral-900", row: "hover:bg-neutral-900", cell: "px-4 py-2 text-emerald-300", cellLink: "font-medium text-emerald-200 underline" },
      list: { wrapper: "mt-4 divide-y divide-emerald-900 rounded-sm border border-emerald-900 bg-neutral-950", dt: "font-medium text-emerald-600", dd: "text-emerald-200" },
      card: { wrapper: "rounded-sm border border-emerald-900 bg-neutral-950 p-6" },
      nav: { bar: "border-b border-emerald-900 bg-neutral-950", brand: "text-base font-semibold tracking-tight text-emerald-300", linksWrap: "flex flex-1 items-center gap-6 text-sm font-medium text-emerald-500", linkHover: "hover:text-emerald-200" },
      heading: { h1: "font-mono text-3xl font-bold tracking-tight text-emerald-300", formH1: "font-mono text-2xl font-bold text-emerald-300", h2: "mt-8 font-mono text-lg font-semibold text-emerald-300" },
      text: { body: "mt-2 text-emerald-500", muted: "text-sm text-emerald-600", link: "text-sm text-emerald-400 hover:underline", danger: "text-sm text-red-400" },
      container: { page: "bg-neutral-950 p-8 min-h-screen", narrow: "mx-auto max-w-lg bg-neutral-950 p-8 min-h-screen" },
    }),

  look("soft-neumorph", "Soft Neumorph",
    "Subtle embossed shadows, low-contrast surfaces, tactile button feel.",
    {
      radius: "rounded-2xl", radiusLg: "rounded-2xl", radiusXl: "rounded-3xl", shadow: "shadow-[6px_6px_16px_rgba(0,0,0,0.08),-6px_-6px_16px_rgba(255,255,255,0.7)]",
      palette: { textPrimary: "text-neutral-800", textSecondary: "text-neutral-600", textMuted: "text-neutral-400", border: "border-neutral-200", fieldBorder: "border-neutral-200", focusBorder: "focus:border-neutral-400", headerBg: "bg-neutral-100", hoverRow: "hover:bg-neutral-100", surface: "bg-neutral-100" },
      button: { primary: "bg-neutral-200 text-neutral-800 shadow-[3px_3px_8px_rgba(0,0,0,0.1),-3px_-3px_8px_rgba(255,255,255,0.8)] hover:bg-neutral-100", ghost: "bg-neutral-100 text-neutral-600 hover:bg-neutral-200", danger: "bg-red-200 text-red-800 hover:bg-red-100" },
      card: { wrapper: "rounded-3xl border-0 bg-neutral-100 p-6 shadow-[6px_6px_16px_rgba(0,0,0,0.08),-6px_-6px_16px_rgba(255,255,255,0.7)]" },
    }),

  look("corporate-clean", "Corporate Clean",
    "Blue/gray palette, structured grid, conservative typography, low visual noise.",
    {
      palette: { textPrimary: "text-blue-950", textSecondary: "text-slate-600", textMuted: "text-slate-400", border: "border-blue-100", fieldBorder: "border-slate-300", focusBorder: "focus:border-blue-500", headerBg: "bg-blue-50", hoverRow: "hover:bg-blue-50", surface: "bg-white" },
      button: { primary: "bg-blue-700 text-white hover:bg-blue-600", ghost: "bg-transparent text-blue-700 hover:bg-blue-50", danger: "bg-red-600 text-white hover:bg-red-500" },
      nav: { bar: "border-b border-blue-100 bg-white", brand: "text-base font-semibold tracking-tight text-blue-950", linksWrap: "flex flex-1 items-center gap-6 text-sm font-medium text-slate-600", linkHover: "hover:text-blue-800" },
      heading: { h1: "text-3xl font-semibold tracking-tight text-blue-950", formH1: "text-2xl font-semibold text-blue-950", h2: "mt-8 text-lg font-semibold text-blue-900" },
    }),

  look("retro-pixel", "Retro Pixel",
    "Pixel-art icons, blocky borders, saturated primary colors, nostalgic 8-bit feel.",
    {
      font: "font-mono", radius: "rounded-none", radiusLg: "rounded-none", radiusXl: "rounded-none", shadow: "shadow-none",
      palette: { textPrimary: "text-violet-950", textSecondary: "text-violet-800", textMuted: "text-violet-500", border: "border-violet-700", fieldBorder: "border-violet-700", focusBorder: "focus:border-fuchsia-500", headerBg: "bg-violet-700", hoverRow: "hover:bg-violet-100", surface: "bg-violet-50" },
      button: { base: "inline-flex items-center justify-center rounded-none border-4 border-violet-900 px-4 py-2 text-sm font-bold uppercase transition-colors disabled:opacity-50", primary: "bg-fuchsia-500 text-white hover:bg-fuchsia-400", ghost: "bg-violet-50 text-violet-900 hover:bg-violet-100", danger: "bg-red-500 text-white hover:bg-red-400" },
      table: { wrapper: "overflow-x-auto rounded-none border-4 border-violet-900", headerCell: "px-4 py-2 text-left text-xs font-bold uppercase tracking-wide text-white", headerBg: "bg-violet-700", row: "hover:bg-violet-100", cell: "px-4 py-2 text-violet-900", cellLink: "font-bold text-fuchsia-600 underline" },
      heading: { h1: "font-mono text-3xl font-black uppercase tracking-tight text-violet-950", formH1: "font-mono text-2xl font-black uppercase text-violet-950", h2: "mt-8 font-mono text-lg font-bold uppercase text-violet-900" },
    }),

  look("luxury-serif", "Luxury Serif",
    "Black/gold or deep-tone palette, elegant serif headings, generous negative space.",
    {
      font: "font-serif", radius: "rounded-none", radiusLg: "rounded-sm", radiusXl: "rounded-sm", shadow: "shadow-none",
      palette: { textPrimary: "text-black", textSecondary: "text-neutral-700", textMuted: "text-neutral-400", border: "border-amber-300", fieldBorder: "border-neutral-300", focusBorder: "focus:border-amber-500", headerBg: "bg-black", hoverRow: "hover:bg-amber-50", surface: "bg-white" },
      button: { base: "inline-flex items-center justify-center rounded-none border border-amber-500 px-5 py-2.5 text-sm font-semibold tracking-wide transition-colors disabled:opacity-50", primary: "bg-black text-amber-400 hover:bg-neutral-900", ghost: "bg-transparent text-black hover:bg-amber-50", danger: "bg-red-700 text-white hover:bg-red-600" },
      table: { wrapper: "overflow-x-auto rounded-sm border border-amber-300", headerCell: "px-4 py-2 text-left text-xs font-semibold uppercase tracking-widest text-amber-400", headerBg: "bg-black", row: "hover:bg-amber-50", cell: "px-4 py-2 text-black", cellLink: "font-semibold text-black underline decoration-amber-400" },
      heading: { h1: "font-serif text-4xl font-semibold tracking-tight text-black", formH1: "font-serif text-2xl font-semibold text-black", h2: "mt-10 font-serif text-xl font-semibold text-black" },
      container: { page: "mx-auto max-w-3xl p-12", narrow: "mx-auto max-w-lg p-12" },
    }),

  look("paper-texture", "Paper Texture",
    "Off-white background, subtle paper/grain texture, ink-like typography, print-inspired.",
    {
      radius: "rounded-none", radiusLg: "rounded-none", radiusXl: "rounded-none", shadow: "shadow-none",
      palette: { textPrimary: "text-stone-900", textSecondary: "text-stone-700", textMuted: "text-stone-500", border: "border-stone-300", fieldBorder: "border-stone-400", focusBorder: "focus:border-stone-600", headerBg: "bg-stone-200", hoverRow: "hover:bg-stone-100", surface: "bg-stone-50" },
      button: { base: "inline-flex items-center justify-center rounded-none border border-stone-800 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50", primary: "bg-stone-800 text-stone-50 hover:bg-stone-700", ghost: "bg-transparent text-stone-800 hover:bg-stone-200", danger: "bg-red-700 text-white hover:bg-red-600" },
      heading: { h1: "text-3xl font-bold tracking-tight text-stone-900", formH1: "text-2xl font-bold text-stone-900", h2: "mt-8 text-lg font-semibold text-stone-800" },
      container: { page: "bg-stone-50 p-8 min-h-screen", narrow: "mx-auto max-w-lg bg-stone-50 p-8 min-h-screen" },
    }),

  look("bold-brutalist-color", "Bold Brutalist Color",
    "Oversized type, clashing bright colors, thick black outlines, high energy.",
    {
      radius: "rounded-none", radiusLg: "rounded-none", radiusXl: "rounded-none", shadow: "shadow-none",
      palette: { textPrimary: "text-black", textSecondary: "text-black", textMuted: "text-neutral-700", border: "border-black", fieldBorder: "border-black", focusBorder: "focus:border-black", headerBg: "bg-lime-400", hoverRow: "hover:bg-fuchsia-100", surface: "bg-cyan-50" },
      button: { base: "inline-flex items-center justify-center rounded-none border-4 border-black px-5 py-2.5 text-sm font-black uppercase transition-colors disabled:opacity-50", primary: "bg-fuchsia-500 text-black hover:bg-fuchsia-400", ghost: "bg-lime-300 text-black hover:bg-lime-200", danger: "bg-red-500 text-black hover:bg-red-400" },
      table: { wrapper: "overflow-x-auto rounded-none border-4 border-black", headerCell: "px-4 py-2 text-left text-xs font-black uppercase tracking-wide text-black", headerBg: "bg-lime-400", row: "hover:bg-fuchsia-100", cell: "px-4 py-2 text-black", cellLink: "font-black text-black underline" },
      heading: { h1: "text-4xl font-black uppercase tracking-tight text-black", formH1: "text-3xl font-black uppercase text-black", h2: "mt-8 text-xl font-black uppercase text-black" },
    }),

  look("scandi-minimal", "Scandi Minimal",
    "Muted neutrals, thin-weight sans-serif, lots of air, understated accents.",
    {
      shadow: "shadow-none",
      palette: { textPrimary: "text-neutral-800", textSecondary: "text-neutral-600", textMuted: "text-neutral-400", border: "border-neutral-200", fieldBorder: "border-neutral-300", focusBorder: "focus:border-neutral-500", headerBg: "bg-neutral-50", hoverRow: "hover:bg-neutral-50", surface: "bg-white" },
      button: { primary: "bg-neutral-800 text-white hover:bg-neutral-700", ghost: "bg-transparent text-neutral-700 hover:bg-neutral-100", danger: "bg-red-500 text-white hover:bg-red-400" },
      heading: { h1: "text-3xl font-light tracking-tight text-neutral-800", formH1: "text-2xl font-light text-neutral-800", h2: "mt-10 text-lg font-normal text-neutral-700" },
      container: { page: "mx-auto max-w-3xl p-10", narrow: "mx-auto max-w-lg p-10" },
    }),

  look("medical-clinical", "Medical Clinical",
    "Cool blues/whites, high legibility, clear iconography, trustworthy and sterile feel.",
    {
      palette: { textPrimary: "text-sky-950", textSecondary: "text-slate-600", textMuted: "text-slate-400", border: "border-sky-100", fieldBorder: "border-sky-200", focusBorder: "focus:border-sky-500", headerBg: "bg-sky-50", hoverRow: "hover:bg-sky-50", surface: "bg-white" },
      button: { primary: "bg-sky-700 text-white hover:bg-sky-600", ghost: "bg-transparent text-sky-700 hover:bg-sky-50", danger: "bg-red-600 text-white hover:bg-red-500" },
      nav: { bar: "border-b border-sky-100 bg-white", brand: "text-base font-semibold tracking-tight text-sky-950", linksWrap: "flex flex-1 items-center gap-6 text-sm font-medium text-slate-600", linkHover: "hover:text-sky-800" },
      heading: { h1: "text-3xl font-semibold tracking-tight text-sky-950", formH1: "text-2xl font-semibold text-sky-950", h2: "mt-8 text-lg font-semibold text-sky-900" },
    }),

  look("kids-friendly", "Kids Friendly",
    "Rounded shapes, bright primary colors, large tap targets, playful illustrations.",
    {
      radius: "rounded-full", radiusLg: "rounded-3xl", radiusXl: "rounded-3xl", shadow: "shadow-lg",
      palette: { textPrimary: "text-sky-950", textSecondary: "text-sky-800", textMuted: "text-sky-500", border: "border-sky-200", fieldBorder: "border-sky-300", focusBorder: "focus:border-pink-500", headerBg: "bg-yellow-100", hoverRow: "hover:bg-yellow-50", surface: "bg-white" },
      button: { base: "inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-bold transition-colors disabled:opacity-50", primary: "bg-pink-500 text-white hover:bg-pink-400", ghost: "bg-yellow-100 text-sky-900 hover:bg-yellow-200", danger: "bg-red-500 text-white hover:bg-red-400" },
      heading: { h1: "text-4xl font-extrabold tracking-tight text-sky-950", formH1: "text-3xl font-extrabold text-sky-950", h2: "mt-8 text-xl font-bold text-sky-900" },
    }),

  look("gradient-vivid", "Gradient Vivid",
    "Bold multi-color gradients as backgrounds/buttons, high-energy, modern SaaS feel.",
    {
      radius: "rounded-xl", radiusLg: "rounded-2xl", radiusXl: "rounded-3xl", shadow: "shadow-lg",
      palette: { textPrimary: "text-slate-900", textSecondary: "text-slate-700", textMuted: "text-slate-400", border: "border-fuchsia-100", fieldBorder: "border-fuchsia-200", focusBorder: "focus:border-fuchsia-500", headerBg: "bg-gradient-to-r from-fuchsia-50 to-cyan-50", hoverRow: "hover:bg-fuchsia-50", surface: "bg-white" },
      button: { base: "inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50", primary: "bg-gradient-to-r from-fuchsia-600 to-cyan-500", ghost: "bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100", danger: "bg-gradient-to-r from-red-600 to-orange-500" },
      nav: { bar: "border-b border-fuchsia-100 bg-white", brand: "bg-gradient-to-r from-fuchsia-600 to-cyan-500 bg-clip-text text-base font-bold tracking-tight text-transparent", linksWrap: "flex flex-1 items-center gap-6 text-sm font-medium text-slate-600", linkHover: "hover:text-fuchsia-600" },
      heading: { h1: "bg-gradient-to-r from-fuchsia-600 to-cyan-500 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent", formH1: "text-2xl font-extrabold text-slate-900", h2: "mt-8 text-lg font-semibold text-slate-900" },
    }),

  look("newsprint", "Newsprint",
    "Black-and-white, serif headlines, column layout, classic newspaper structure.",
    {
      font: "font-serif", radius: "rounded-none", radiusLg: "rounded-none", radiusXl: "rounded-none", shadow: "shadow-none",
      palette: { textPrimary: "text-black", textSecondary: "text-neutral-800", textMuted: "text-neutral-500", border: "border-black", fieldBorder: "border-neutral-500", focusBorder: "focus:border-black", headerBg: "bg-white", hoverRow: "hover:bg-neutral-100", surface: "bg-white" },
      button: { base: "inline-flex items-center justify-center rounded-none border border-black px-4 py-2 text-sm font-semibold uppercase transition-colors disabled:opacity-50", primary: "bg-black text-white hover:bg-neutral-800", ghost: "bg-white text-black hover:bg-neutral-100", danger: "bg-white text-red-700 border-red-700 hover:bg-red-50" },
      table: { wrapper: "overflow-x-auto rounded-none border border-black", headerCell: "border-b-2 border-black px-4 py-2 text-left text-xs font-bold uppercase tracking-wide text-black", headerBg: "bg-white", row: "hover:bg-neutral-100", cell: "px-4 py-2 text-black", cellLink: "font-semibold text-black underline" },
      heading: { h1: "font-serif text-4xl font-black tracking-tight text-black", formH1: "font-serif text-2xl font-black text-black", h2: "mt-8 font-serif text-lg font-bold text-black" },
      container: { page: "mx-auto max-w-4xl p-8 columns-1", narrow: "mx-auto max-w-lg p-8" },
    }),

  look("glass-dashboard-dark", "Glass Dashboard Dark",
    "Dark mode with glassmorphic panels, glowing accent colors, data-viz oriented.",
    {
      radius: "rounded-2xl", radiusLg: "rounded-2xl", radiusXl: "rounded-3xl", shadow: "shadow-2xl",
      palette: { textPrimary: "text-cyan-50", textSecondary: "text-cyan-200", textMuted: "text-cyan-500", border: "border-cyan-500/20", fieldBorder: "border-cyan-500/30", focusBorder: "focus:border-cyan-400", headerBg: "bg-white/5", hoverRow: "hover:bg-white/5", surface: "bg-slate-900/60 backdrop-blur-md" },
      button: { primary: "bg-cyan-500 text-slate-950 hover:bg-cyan-400", ghost: "bg-white/5 text-cyan-200 backdrop-blur hover:bg-white/10", danger: "bg-red-500 text-white hover:bg-red-400" },
      field: { input: "rounded-2xl border border-cyan-500/30 bg-slate-900/60 px-3 py-2 text-sm text-cyan-100 focus:border-cyan-400 focus:outline-none", label: "text-xs font-semibold uppercase tracking-wide text-cyan-500" },
      table: { wrapper: "overflow-x-auto rounded-2xl border border-cyan-500/20 bg-slate-900/60 backdrop-blur-md", headerCell: "px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-cyan-400", headerBg: "bg-white/5", row: "hover:bg-white/5", cell: "px-4 py-2 text-cyan-100", cellLink: "font-medium text-cyan-300 underline" },
      card: { wrapper: "rounded-3xl border border-cyan-500/20 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-md" },
      nav: { bar: "border-b border-cyan-500/20 bg-slate-950/80 backdrop-blur-md", brand: "text-base font-semibold tracking-tight text-cyan-50", linksWrap: "flex flex-1 items-center gap-6 text-sm font-medium text-cyan-300", linkHover: "hover:text-cyan-50" },
      heading: { h1: "text-3xl font-bold tracking-tight text-cyan-50", formH1: "text-2xl font-bold text-cyan-50", h2: "mt-8 text-lg font-semibold text-cyan-100" },
      text: { body: "mt-2 text-cyan-300", muted: "text-sm text-cyan-500", link: "text-sm text-cyan-300 hover:underline", danger: "text-sm text-red-400" },
      container: { page: "bg-slate-950 p-8 min-h-screen", narrow: "mx-auto max-w-lg bg-slate-950 p-8 min-h-screen" },
    }),
];

/**
 * `renderStrategy` only exists for archetypes with real DataTable/DataList/InteractiveList
 * rendering support. `containerWidth`/`showStatBand` are additive traits used by uiScreens.mjs
 * regardless of renderStrategy. `implemented: false` entries are valid enum values for the spec
 * (so the generating LLM can express intent/variety) but render using the dense-table fallback.
 */
export const LAYOUT_ARCHETYPES = [
  { id: "dense-table", label: "Dense Table", description: "Classic row/column table with sortable headers, optimized for scanning many records.", implemented: true, renderStrategy: "table" },
  { id: "card-grid", label: "Card Grid", description: "Records displayed as a grid of equal-size cards, one record per card.", implemented: true, renderStrategy: "cards" },
  { id: "stacked-list", label: "Stacked List", description: "Simple vertical list of rows with minimal decoration, one record per line.", implemented: true, renderStrategy: "stacked" },
  { id: "split-detail", label: "Split Detail", description: "List on the left, selected record's full detail on the right (master-detail).", implemented: false },
  { id: "bento", label: "Bento", description: "Grid of variable-sized cells, one large anchor block surrounded by smaller ones.", implemented: false },
  { id: "two-column-reader", label: "Two-Column Reader", description: "Narrow centered text column optimized for reading, minimal UI around it.", implemented: true, renderStrategy: "table", containerWidth: "mx-auto max-w-2xl p-8" },
  { id: "form-focused", label: "Form Focused", description: "Single centered column form, no surrounding distractions.", implemented: false },
  { id: "tabbed-sections", label: "Tabbed Sections", description: "Content split across horizontal tabs, one section visible at a time.", implemented: false },
  { id: "sidebar-shell", label: "Sidebar Shell", description: "Persistent left sidebar navigation with main content area on the right.", implemented: false },
  { id: "kanban-columns", label: "Kanban Columns", description: "Multiple vertical lanes/columns, records shown as draggable-style cards.", implemented: false },
  { id: "timeline-feed", label: "Timeline Feed", description: "Vertically scrolling chronological feed of items, newest first.", implemented: false },
  { id: "hero-plus-grid", label: "Hero Plus Grid", description: "Large featured hero block at top, followed by a grid of secondary items.", implemented: false },
  { id: "carousel-strip", label: "Carousel Strip", description: "Horizontally scrollable row of cards, one visible focus item at a time.", implemented: false },
  { id: "accordion-list", label: "Accordion List", description: "Collapsible expandable rows, each revealing detail on click.", implemented: true, renderStrategy: "accordion" },
  { id: "gallery-mosaic", label: "Gallery Mosaic", description: "Irregular image/content grid emphasizing visual variety over uniform rows.", implemented: false },
  { id: "stat-summary-band", label: "Stat Summary Band", description: "Row of key numeric stats/metrics at top, detail content below.", implemented: true, renderStrategy: "table", showStatBand: true },
  { id: "calendar-grid", label: "Calendar Grid", description: "Month/week grid layout for date-based records.", implemented: false },
  { id: "inbox-triple-pane", label: "Inbox Triple Pane", description: "Three-column layout: folder/filter list, item list, item detail.", implemented: false },
  { id: "wizard-steps", label: "Wizard Steps", description: "Linear step-by-step form flow with progress indicator.", implemented: false },
  { id: "full-bleed-showcase", label: "Full-Bleed Showcase", description: "Edge-to-edge large visual blocks, minimal text, presentation-style.", implemented: false },
];

const DEFAULT_LOOK_ID = "minimal-mono";
const DEFAULT_ARCHETYPE_ID = "dense-table";

/** Resolve a `design.look` id to its Tailwind token set, defaulting to minimal-mono. */
export function resolveDesignLook(id) {
  return (DESIGN_LOOKS.find((l) => l.id === id) || DESIGN_LOOKS.find((l) => l.id === DEFAULT_LOOK_ID)).tokens;
}

/**
 * Resolve a `design.components` id to its layout archetype metadata. Unknown or
 * not-yet-implemented ids fall back to dense-table's renderStrategy/traits, but the
 * originally requested id is preserved on `requestedId` for logging/diagnostics.
 */
export function resolveLayoutArchetype(id) {
  const found = LAYOUT_ARCHETYPES.find((a) => a.id === id);
  const fallback = LAYOUT_ARCHETYPES.find((a) => a.id === DEFAULT_ARCHETYPE_ID);
  if (!found || !found.implemented) {
    return { ...fallback, requestedId: id ?? DEFAULT_ARCHETYPE_ID };
  }
  return { ...found, requestedId: id };
}
