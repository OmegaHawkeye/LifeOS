// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("LifeOS application", () => {
  it("shows that the application foundation is ready", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "LifeOS" })).toBeVisible();
    expect(screen.getByText("Foundation ready")).toBeVisible();
  });
});
