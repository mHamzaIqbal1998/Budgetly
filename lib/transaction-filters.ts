// Advanced transaction filters – shared types, defaults, and Firefly III
// search-query composition. Used by the transactions screen and the filter
// modal so query building stays in one place.
//
// Firefly III search operator reference:
// https://docs.firefly-iii.org/references/firefly-iii/search/

export type DatePresetKey =
  | "any"
  | "today"
  | "week"
  | "month"
  | "last30"
  | "quarter"
  | "year"
  | "custom";

export const DATE_PRESETS: { key: DatePresetKey; label: string }[] = [
  { key: "any", label: "Any time" },
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "last30", label: "Last 30 days" },
  { key: "quarter", label: "This quarter" },
  { key: "year", label: "This year" },
  { key: "custom", label: "Custom" },
];

export interface AdvancedFilters {
  /** Which date preset is selected. "custom" uses dateAfter/dateBefore. */
  datePreset: DatePresetKey;
  /** YYYY-MM-DD – lower bound (inclusive) for custom range. */
  dateAfter: string | null;
  /** YYYY-MM-DD – upper bound (inclusive) for custom range. */
  dateBefore: string | null;
  /** Minimum amount (amount more than). */
  amountMin: string;
  /** Maximum amount (amount less than). */
  amountMax: string;
  /** Exact category name. */
  categoryName: string | null;
  /** Exact budget name. */
  budgetName: string | null;
  /** Tag (exact). */
  tag: string;
  /** Only transactions that have attachments. */
  hasAttachments: boolean;
  /** Only reconciled transactions. */
  reconciled: boolean;
  /** Only transactions that have notes. */
  hasNotes: boolean;
}

export const DEFAULT_FILTERS: AdvancedFilters = {
  datePreset: "any",
  dateAfter: null,
  dateBefore: null,
  amountMin: "",
  amountMax: "",
  categoryName: null,
  budgetName: null,
  tag: "",
  hasAttachments: false,
  reconciled: false,
  hasNotes: false,
};

export type FilterChipKey =
  | "date"
  | "amountMin"
  | "amountMax"
  | "category"
  | "budget"
  | "tag"
  | "hasAttachments"
  | "reconciled"
  | "hasNotes";

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/** Format a Date to a local YYYY-MM-DD string. */
export function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse a YYYY-MM-DD string into a local Date (noon to avoid TZ edges). */
export function parseYmd(value: string | null): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0);
}

/**
 * Resolve a preset (or custom range) into explicit inclusive after/before
 * YYYY-MM-DD bounds. Presets are resolved relative to "now" at call time.
 */
export function resolvePresetRange(filters: AdvancedFilters): {
  after: string | null;
  before: string | null;
} {
  const now = new Date();

  switch (filters.datePreset) {
    case "today":
      return { after: ymd(now), before: ymd(now) };

    case "week": {
      // Week starts on Monday.
      const start = new Date(now);
      const day = (start.getDay() + 6) % 7; // 0 = Monday
      start.setDate(start.getDate() - day);
      return { after: ymd(start), before: ymd(now) };
    }

    case "month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { after: ymd(start), before: ymd(now) };
    }

    case "last30": {
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      return { after: ymd(start), before: ymd(now) };
    }

    case "quarter": {
      const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), qStartMonth, 1);
      return { after: ymd(start), before: ymd(now) };
    }

    case "year": {
      const start = new Date(now.getFullYear(), 0, 1);
      return { after: ymd(start), before: ymd(now) };
    }

    case "custom":
      return { after: filters.dateAfter, before: filters.dateBefore };

    case "any":
    default:
      return { after: null, before: null };
  }
}

// ---------------------------------------------------------------------------
// Query composition
// ---------------------------------------------------------------------------

/** Wrap values containing spaces in quotes for the Firefly search parser. */
function quoteValue(value: string): string {
  const cleaned = value.replace(/"/g, "").trim();
  return /\s/.test(cleaned) ? `"${cleaned}"` : cleaned;
}

/**
 * Build a Firefly III search query string from the account scope, type tab,
 * and the advanced filters. All operators are joined with AND (space).
 */
export function buildSearchQuery(params: {
  accountId?: string;
  type: "all" | "withdrawal" | "deposit" | "transfer";
  filters: AdvancedFilters;
}): string {
  const { accountId, type, filters } = params;
  const parts: string[] = [];

  if (accountId) parts.push(`account_id:${accountId}`);
  if (type !== "all") parts.push(`type:${type}`);

  const { after, before } = resolvePresetRange(filters);
  if (after) parts.push(`date_after:${after}`);
  if (before) parts.push(`date_before:${before}`);

  const min = filters.amountMin.trim();
  const max = filters.amountMax.trim();
  if (min) parts.push(`more:${min}`);
  if (max) parts.push(`less:${max}`);

  if (filters.categoryName)
    parts.push(`category_is:${quoteValue(filters.categoryName)}`);
  if (filters.budgetName)
    parts.push(`budget_is:${quoteValue(filters.budgetName)}`);
  if (filters.tag.trim()) parts.push(`tag_is:${quoteValue(filters.tag)}`);

  if (filters.hasAttachments) parts.push("has_attachments:true");
  if (filters.reconciled) parts.push("reconciled:true");
  if (filters.hasNotes) parts.push("has_any_notes:true");

  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Active-filter introspection (for badge count + summary chips)
// ---------------------------------------------------------------------------

export function countActiveFilters(filters: AdvancedFilters): number {
  let count = 0;
  if (filters.datePreset !== "any") {
    // Custom only counts when at least one bound is set.
    if (
      filters.datePreset !== "custom" ||
      filters.dateAfter ||
      filters.dateBefore
    ) {
      count++;
    }
  }
  if (filters.amountMin.trim()) count++;
  if (filters.amountMax.trim()) count++;
  if (filters.categoryName) count++;
  if (filters.budgetName) count++;
  if (filters.tag.trim()) count++;
  if (filters.hasAttachments) count++;
  if (filters.reconciled) count++;
  if (filters.hasNotes) count++;
  return count;
}

function dateChipLabel(filters: AdvancedFilters): string | null {
  if (filters.datePreset === "any") return null;
  if (filters.datePreset === "custom") {
    if (!filters.dateAfter && !filters.dateBefore) return null;
    if (filters.dateAfter && filters.dateBefore) {
      return `${filters.dateAfter} → ${filters.dateBefore}`;
    }
    if (filters.dateAfter) return `From ${filters.dateAfter}`;
    return `Until ${filters.dateBefore}`;
  }
  return DATE_PRESETS.find((p) => p.key === filters.datePreset)?.label ?? null;
}

/** Build the list of removable summary chips for the currently active filters. */
export function getActiveFilterChips(
  filters: AdvancedFilters
): { key: FilterChipKey; label: string; icon: string }[] {
  const chips: { key: FilterChipKey; label: string; icon: string }[] = [];

  const dateLabel = dateChipLabel(filters);
  if (dateLabel)
    chips.push({ key: "date", label: dateLabel, icon: "calendar-range" });

  if (filters.amountMin.trim())
    chips.push({
      key: "amountMin",
      label: `≥ ${filters.amountMin.trim()}`,
      icon: "arrow-up",
    });
  if (filters.amountMax.trim())
    chips.push({
      key: "amountMax",
      label: `≤ ${filters.amountMax.trim()}`,
      icon: "arrow-down",
    });
  if (filters.categoryName)
    chips.push({
      key: "category",
      label: filters.categoryName,
      icon: "shape-outline",
    });
  if (filters.budgetName)
    chips.push({
      key: "budget",
      label: filters.budgetName,
      icon: "wallet-outline",
    });
  if (filters.tag.trim())
    chips.push({
      key: "tag",
      label: `#${filters.tag.trim()}`,
      icon: "tag-outline",
    });
  if (filters.hasAttachments)
    chips.push({
      key: "hasAttachments",
      label: "Has attachments",
      icon: "paperclip",
    });
  if (filters.reconciled)
    chips.push({
      key: "reconciled",
      label: "Reconciled",
      icon: "check-decagram",
    });
  if (filters.hasNotes)
    chips.push({
      key: "hasNotes",
      label: "Has notes",
      icon: "note-text-outline",
    });

  return chips;
}

/** Return a new filters object with the given chip's filter cleared. */
export function clearFilter(
  filters: AdvancedFilters,
  key: FilterChipKey
): AdvancedFilters {
  switch (key) {
    case "date":
      return {
        ...filters,
        datePreset: "any",
        dateAfter: null,
        dateBefore: null,
      };
    case "amountMin":
      return { ...filters, amountMin: "" };
    case "amountMax":
      return { ...filters, amountMax: "" };
    case "category":
      return { ...filters, categoryName: null };
    case "budget":
      return { ...filters, budgetName: null };
    case "tag":
      return { ...filters, tag: "" };
    case "hasAttachments":
      return { ...filters, hasAttachments: false };
    case "reconciled":
      return { ...filters, reconciled: false };
    case "hasNotes":
      return { ...filters, hasNotes: false };
    default:
      return filters;
  }
}
