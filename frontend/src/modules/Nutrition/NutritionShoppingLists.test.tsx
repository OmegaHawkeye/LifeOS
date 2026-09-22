// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NutritionShoppingLists } from "./NutritionShoppingLists";
import {
  addNutritionShoppingItem,
  deleteNutritionShoppingItem,
  generateNutritionShoppingList,
  getNutritionShoppingLists,
  updateNutritionShoppingItem,
} from "./nutrition";
import type { NutritionShoppingItem, NutritionShoppingList } from "./nutrition";

vi.mock("./nutrition", () => ({
  addNutritionShoppingItem: vi.fn(),
  deleteNutritionShoppingItem: vi.fn(),
  generateNutritionShoppingList: vi.fn(),
  getNutritionShoppingLists: vi.fn(),
  updateNutritionShoppingItem: vi.fn(),
}));

const oats: NutritionShoppingItem = {
  id: 2,
  name: "Oats",
  quantity: "125.0000",
  unit: "g",
  store_section: "pantry",
  is_checked: false,
  is_manual: false,
  quantity_warning: true,
};

const list: NutritionShoppingList = {
  id: 1,
  name: "Weekly groceries",
  start_date: "2026-09-21",
  end_date: "2026-09-27",
  unavailable_recipe_count: 1,
  items: [oats],
};

describe("NutritionShoppingLists", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.mocked(getNutritionShoppingLists).mockResolvedValue([list]);
    vi.mocked(generateNutritionShoppingList).mockResolvedValue(list);
    vi.mocked(addNutritionShoppingItem).mockResolvedValue({
      ...oats,
      id: 3,
      name: "Olive oil",
      quantity: "1.0000",
      unit: "bottle",
      store_section: "other",
      is_manual: true,
      quantity_warning: false,
    });
    vi.mocked(updateNutritionShoppingItem).mockImplementation(
      async (_listId, _itemId, changes) => ({
        ...oats,
        ...changes,
        quantity:
          changes.quantity === undefined
            ? oats.quantity
            : changes.quantity === null
              ? null
              : String(changes.quantity),
        unit: changes.unit === undefined ? oats.unit : changes.unit,
      }),
    );
    vi.mocked(deleteNutritionShoppingItem).mockResolvedValue();
  });

  it("generates a list for a chosen date range", async () => {
    const user = userEvent.setup();
    render(<NutritionShoppingLists />);
    await screen.findByRole("heading", { name: "Weekly groceries" });
    await user.clear(screen.getByLabelText("From"));
    await user.type(screen.getByLabelText("From"), "2026-09-21");
    await user.clear(screen.getByLabelText("Through"));
    await user.type(screen.getByLabelText("Through"), "2026-09-27");
    await user.click(
      screen.getByRole("button", { name: "Generate from planned meals" }),
    );
    await waitFor(() =>
      expect(generateNutritionShoppingList).toHaveBeenCalledWith({
        start_date: "2026-09-21",
        end_date: "2026-09-27",
        name: "Weekly groceries",
      }),
    );
    expect(
      await screen.findByText(/1 planned meal had no available recipe/),
    ).toBeVisible();
    expect(screen.getByText(/quantities were kept separate/)).toBeVisible();
  });

  it("supports manual additions, checking, editing, and removal", async () => {
    const user = userEvent.setup();
    render(<NutritionShoppingLists />);
    await screen.findByRole("heading", { name: "Weekly groceries" });

    await user.type(screen.getByLabelText("New item name"), "Olive oil");
    await user.type(screen.getByLabelText("New item quantity"), "1");
    await user.type(screen.getByLabelText("New item unit"), "bottle");
    await user.selectOptions(
      screen.getByLabelText("New item store section"),
      "pantry",
    );
    await user.click(screen.getByRole("button", { name: "Add item" }));
    await waitFor(() =>
      expect(addNutritionShoppingItem).toHaveBeenCalledWith(1, {
        name: "Olive oil",
        quantity: 1,
        unit: "bottle",
        store_section: "pantry",
      }),
    );

    await user.click(screen.getByLabelText("Pick up Oats"));
    await waitFor(() =>
      expect(updateNutritionShoppingItem).toHaveBeenCalledWith(1, 2, {
        is_checked: true,
      }),
    );

    await user.click(screen.getByRole("button", { name: "Edit Oats" }));
    await user.clear(screen.getByRole("textbox", { name: "Name for Oats" }));
    await user.type(
      screen.getByRole("textbox", { name: "Name for Oats" }),
      "Rolled oats",
    );
    await user.click(screen.getByRole("button", { name: "Save item" }));
    await waitFor(() =>
      expect(updateNutritionShoppingItem).toHaveBeenCalledWith(
        1,
        2,
        expect.objectContaining({
          name: "Rolled oats",
          store_section: "pantry",
        }),
      ),
    );

    await user.click(
      screen.getByRole("button", { name: "Remove Rolled oats" }),
    );
    await waitFor(() =>
      expect(deleteNutritionShoppingItem).toHaveBeenCalledWith(1, 2),
    );
  });

  it("replaces merged items and flags separate units after a manual addition", async () => {
    const user = userEvent.setup();
    vi.mocked(getNutritionShoppingLists).mockResolvedValueOnce([
      { ...list, items: [{ ...oats, quantity_warning: false }] },
    ]);
    vi.mocked(addNutritionShoppingItem)
      .mockResolvedValueOnce({
        ...oats,
        quantity: "175.0000",
        is_manual: true,
      })
      .mockResolvedValueOnce({
        ...oats,
        id: 3,
        quantity: "1.0000",
        unit: "cup",
        quantity_warning: true,
        is_manual: true,
      })
      .mockResolvedValueOnce({
        ...oats,
        id: 4,
        quantity: "2.0000",
        unit: null,
        quantity_warning: true,
        is_manual: true,
      });

    render(<NutritionShoppingLists />);
    await screen.findByRole("heading", { name: "Weekly groceries" });

    await user.type(screen.getByLabelText("New item name"), " oats ");
    await user.type(screen.getByLabelText("New item quantity"), "50");
    await user.type(screen.getByLabelText("New item unit"), "g");
    await user.click(screen.getByRole("button", { name: "Add item" }));
    await waitFor(() => expect(screen.getByText("175.0000 g")).toBeVisible());
    expect(screen.getAllByText("Oats")).toHaveLength(1);

    await user.type(screen.getByLabelText("New item name"), "Oats");
    await user.type(screen.getByLabelText("New item quantity"), "1");
    await user.type(screen.getByLabelText("New item unit"), "cup");
    await user.click(screen.getByRole("button", { name: "Add item" }));

    await waitFor(() =>
      expect(screen.getAllByText(/quantities were kept separate/)).toHaveLength(
        2,
      ),
    );

    await user.type(screen.getByLabelText("New item name"), "Oats");
    await user.type(screen.getByLabelText("New item quantity"), "2");
    await user.click(screen.getByRole("button", { name: "Add item" }));

    await waitFor(() =>
      expect(screen.getAllByText(/quantities were kept separate/)).toHaveLength(
        3,
      ),
    );
  });
});
