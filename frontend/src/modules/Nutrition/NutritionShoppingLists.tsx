import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  addNutritionShoppingItem,
  deleteNutritionShoppingItem,
  generateNutritionShoppingList,
  getNutritionShoppingLists,
  updateNutritionShoppingItem,
} from "./nutrition";
import type { NutritionShoppingItem, NutritionShoppingList } from "./nutrition";

const storeSections = [
  ["produce", "Produce"],
  ["meat-seafood", "Meat & seafood"],
  ["dairy", "Dairy"],
  ["bakery", "Bakery"],
  ["frozen", "Frozen"],
  ["pantry", "Pantry"],
  ["other", "Other"],
] as const;

export function NutritionShoppingLists() {
  const [lists, setLists] = useState<NutritionShoppingList[]>([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    getNutritionShoppingLists()
      .then((loadedLists) => {
        setLists(loadedLists);
        setSelectedListId(loadedLists[0] ? String(loadedLists[0].id) : "");
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const activeList = lists.find((list) => String(list.id) === selectedListId);

  async function generateList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const list = await generateNutritionShoppingList({
        start_date: String(form.get("start_date")),
        end_date: String(form.get("end_date")),
        name: String(form.get("list_name") || "") || undefined,
      });
      setLists((current) => [list, ...current]);
      setSelectedListId(String(list.id));
      setError(false);
    } catch {
      setError(true);
    }
  }

  async function addManualItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeList) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const item = await addNutritionShoppingItem(activeList.id, {
        name: String(form.get("item_name")),
        quantity: optionalNumber(form.get("item_quantity")),
        unit: String(form.get("item_unit") || "") || null,
        store_section: String(
          form.get("store_section"),
        ) as NutritionShoppingItem["store_section"],
      });
      updateListItems(activeList.id, (items) =>
        items.some((existing) => existing.id === item.id)
          ? replaceItem(items, item)
          : [...items, item],
      );
      formElement.reset();
      setError(false);
    } catch {
      setError(true);
    }
  }

  async function toggleChecked(item: NutritionShoppingItem) {
    if (!activeList) return;
    try {
      const updated = await updateNutritionShoppingItem(
        activeList.id,
        item.id,
        {
          is_checked: !item.is_checked,
        },
      );
      updateListItems(activeList.id, (items) => replaceItem(items, updated));
      setError(false);
    } catch {
      setError(true);
    }
  }

  async function saveItem(
    event: FormEvent<HTMLFormElement>,
    item: NutritionShoppingItem,
  ) {
    event.preventDefault();
    if (!activeList) return;
    const form = new FormData(event.currentTarget);
    setSavingId(item.id);
    try {
      const updated = await updateNutritionShoppingItem(
        activeList.id,
        item.id,
        {
          name: String(form.get("name")),
          quantity: optionalNumber(form.get("quantity")),
          unit: String(form.get("unit") || "") || null,
          store_section: String(
            form.get("store_section"),
          ) as NutritionShoppingItem["store_section"],
        },
      );
      updateListItems(activeList.id, (items) => replaceItem(items, updated));
      setEditingId(null);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setSavingId(null);
    }
  }

  async function removeItem(itemId: number) {
    if (!activeList) return;
    try {
      await deleteNutritionShoppingItem(activeList.id, itemId);
      updateListItems(activeList.id, (items) =>
        items.filter((item) => item.id !== itemId),
      );
      setError(false);
    } catch {
      setError(true);
    }
  }

  function updateListItems(
    listId: number,
    transform: (items: NutritionShoppingItem[]) => NutritionShoppingItem[],
  ) {
    setLists((current) =>
      current.map((list) =>
        list.id === listId
          ? { ...list, items: refreshQuantityWarnings(transform(list.items)) }
          : list,
      ),
    );
  }

  return (
    <section
      aria-labelledby="shopping-list-title"
      className="mt-8 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-stone-900 sm:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Take it to the store
          </p>
          <h2 className="mt-1 text-2xl font-semibold" id="shopping-list-title">
            Shopping lists
          </h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Combine matching ingredients across your planned meals.
          </p>
        </div>
        {lists.length > 0 && (
          <label className="min-w-52 text-sm font-medium">
            Saved list
            <select
              aria-label="Saved shopping list"
              className={fieldClass}
              onChange={(event) => setSelectedListId(event.currentTarget.value)}
              value={selectedListId}
            >
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name} · {list.start_date}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {error && (
        <p
          className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/50 dark:text-rose-200"
          role="alert"
        >
          Shopping list could not be loaded or saved.
        </p>
      )}

      <form
        className="mt-5 grid gap-3 rounded-2xl bg-stone-50 p-4 dark:bg-white/5 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={generateList}
      >
        <label className="text-xs font-medium">
          List name
          <input
            className={fieldClass}
            defaultValue="Weekly groceries"
            name="list_name"
          />
        </label>
        <label className="text-xs font-medium">
          From
          <input
            className={fieldClass}
            defaultValue={currentWeekStart()}
            name="start_date"
            required
            type="date"
          />
        </label>
        <label className="text-xs font-medium">
          Through
          <input
            className={fieldClass}
            defaultValue={addDays(currentWeekStart(), 6)}
            name="end_date"
            required
            type="date"
          />
        </label>
        <button className={buttonClass} type="submit">
          Generate from planned meals
        </button>
      </form>

      {loading ? (
        <p className="mt-5 text-sm text-stone-500" role="status">
          Loading shopping lists…
        </p>
      ) : activeList ? (
        <>
          <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-lg font-semibold">{activeList.name}</h3>
            <p className="text-xs text-stone-500">
              {activeList.start_date} – {activeList.end_date} ·{" "}
              {activeList.items.filter((item) => item.is_checked).length}/
              {activeList.items.length} checked
            </p>
          </div>
          {activeList.unavailable_recipe_count > 0 && (
            <p
              className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
              role="status"
            >
              {activeList.unavailable_recipe_count} planned meal
              {activeList.unavailable_recipe_count === 1 ? "" : "s"} had no
              available recipe, so its ingredients could not be added.
            </p>
          )}
          {activeList.items.length ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {storeSections.map(([sectionId, sectionLabel]) => {
                const items = activeList.items.filter(
                  (item) => item.store_section === sectionId,
                );
                if (!items.length) return null;
                return (
                  <section
                    aria-label={sectionLabel}
                    className="rounded-2xl border border-stone-200 p-4 dark:border-white/10"
                    key={sectionId}
                  >
                    <h4 className="font-semibold">
                      {sectionLabel}{" "}
                      <span className="text-xs font-normal text-stone-500">
                        {items.length}
                      </span>
                    </h4>
                    <ul className="mt-3 space-y-3">
                      {items.map((item) => (
                        <li
                          className="border-t border-stone-100 pt-3 first:border-0 first:pt-0 dark:border-white/10"
                          key={item.id}
                        >
                          {editingId === item.id ? (
                            <form
                              className="space-y-2"
                              onSubmit={(event) => void saveItem(event, item)}
                            >
                              <input
                                aria-label={`Name for ${item.name}`}
                                className={fieldClass}
                                defaultValue={item.name}
                                name="name"
                                required
                              />
                              <div className="flex gap-2">
                                <input
                                  aria-label={`Quantity for ${item.name}`}
                                  className={fieldClass}
                                  defaultValue={item.quantity ?? ""}
                                  min="0.001"
                                  name="quantity"
                                  placeholder="Qty"
                                  step="0.001"
                                  type="number"
                                />
                                <input
                                  aria-label={`Unit for ${item.name}`}
                                  className={fieldClass}
                                  defaultValue={item.unit ?? ""}
                                  name="unit"
                                  placeholder="Unit"
                                />
                              </div>
                              <select
                                aria-label={`Store section for ${item.name}`}
                                className={fieldClass}
                                defaultValue={item.store_section}
                                name="store_section"
                              >
                                {storeSections.map(([id, label]) => (
                                  <option key={id} value={id}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                              <div className="flex gap-2">
                                <button
                                  className={buttonClass}
                                  disabled={savingId === item.id}
                                  type="submit"
                                >
                                  Save item
                                </button>
                                <button
                                  className={secondaryButtonClass}
                                  onClick={() => setEditingId(null)}
                                  type="button"
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          ) : (
                            <div className="flex items-start gap-2">
                              <input
                                aria-label={`Pick up ${item.name}`}
                                checked={item.is_checked}
                                className="mt-1 size-4 accent-emerald-600"
                                onChange={() => void toggleChecked(item)}
                                type="checkbox"
                              />
                              <div className="min-w-0 flex-1">
                                <p
                                  className={`break-words text-sm font-medium ${item.is_checked ? "text-stone-400 line-through" : ""}`}
                                >
                                  {item.name}
                                </p>
                                <p className="mt-0.5 text-xs text-stone-500">
                                  {item.quantity ?? "—"} {item.unit ?? ""}
                                </p>
                                {item.quantity_warning && (
                                  <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
                                    This ingredient has incompatible or missing
                                    units; quantities were kept separate.
                                  </p>
                                )}
                                {item.is_manual && (
                                  <span className="text-[10px] text-stone-400">
                                    Manual
                                  </span>
                                )}
                              </div>
                              <div className="flex shrink-0 gap-1">
                                <button
                                  aria-label={`Edit ${item.name}`}
                                  className={iconButtonClass}
                                  onClick={() => setEditingId(item.id)}
                                  type="button"
                                >
                                  Edit
                                </button>
                                <button
                                  aria-label={`Remove ${item.name}`}
                                  className={iconButtonClass}
                                  onClick={() => void removeItem(item.id)}
                                  type="button"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-stone-300 p-5 text-sm text-stone-500">
              No ingredients were found for this date range. You can still add
              items manually.
            </p>
          )}

          <form
            className="mt-5 grid gap-2 rounded-2xl border border-stone-200 p-4 dark:border-white/10 sm:grid-cols-2 lg:grid-cols-5"
            onSubmit={addManualItem}
          >
            <h4 className="font-semibold sm:col-span-2 lg:col-span-5">
              Add an item manually
            </h4>
            <input
              aria-label="New item name"
              className={fieldClass}
              name="item_name"
              placeholder="Item"
              required
            />
            <input
              aria-label="New item quantity"
              className={fieldClass}
              min="0.001"
              name="item_quantity"
              placeholder="Quantity"
              step="0.001"
              type="number"
            />
            <input
              aria-label="New item unit"
              className={fieldClass}
              name="item_unit"
              placeholder="Unit (optional)"
            />
            <select
              aria-label="New item store section"
              className={fieldClass}
              defaultValue="other"
              name="store_section"
            >
              {storeSections.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            <button className={buttonClass} type="submit">
              Add item
            </button>
          </form>
        </>
      ) : !loading ? (
        <p className="mt-5 rounded-xl border border-dashed border-stone-300 p-5 text-sm text-stone-500">
          Generate a list for a date range with planned meals, or start with a
          manual list by generating an empty range.
        </p>
      ) : null}
    </section>
  );
}

function replaceItem(
  items: NutritionShoppingItem[],
  replacement: NutritionShoppingItem,
) {
  return items.map((item) => (item.id === replacement.id ? replacement : item));
}

function refreshQuantityWarnings(items: NutritionShoppingItem[]) {
  const unitsByIngredient = new Map<string, Set<string>>();
  const missingUnitCounts = new Map<string, number>();
  for (const item of items) {
    const ingredient = normalize(item.name);
    const unit = normalize(item.unit ?? "");
    const units = unitsByIngredient.get(ingredient) ?? new Set<string>();
    units.add(unit);
    unitsByIngredient.set(ingredient, units);
    if (unit === "") {
      missingUnitCounts.set(
        ingredient,
        (missingUnitCounts.get(ingredient) ?? 0) + 1,
      );
    }
  }

  return items.map((item) => ({
    ...item,
    quantity_warning:
      (unitsByIngredient.get(normalize(item.name))?.size ?? 0) > 1 ||
      (missingUnitCounts.get(normalize(item.name)) ?? 0) > 1,
  }));
}

function normalize(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function optionalNumber(value: FormDataEntryValue | null): number | null {
  if (value === null || value === "") return null;
  return Number(value);
}

function currentWeekStart() {
  const date = new Date();
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return dateString(date);
}

function addDays(dateStringValue: string, days: number) {
  const date = new Date(`${dateStringValue}T12:00:00`);
  date.setDate(date.getDate() + days);
  return dateString(date);
}

function dateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const fieldClass =
  "mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-stone-950";
const buttonClass =
  "rounded-xl bg-stone-900 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-stone-900";
const secondaryButtonClass =
  "rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold dark:border-white/15";
const iconButtonClass =
  "rounded-md px-2 py-1 text-xs text-stone-500 hover:bg-stone-100 dark:hover:bg-white/10";
