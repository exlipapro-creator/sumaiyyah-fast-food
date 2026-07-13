// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import MoneyText from "@/components/MoneyText";
import EmptyState from "@/components/EmptyState";

describe("MoneyText", () => {
  it("renders the formatted TSH amount", () => {
    render(<MoneyText amount={12345} />);
    expect(screen.getByText("TSH 12,345")).toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  it("renders title, description, and action", () => {
    render(
      <EmptyState testId="empty" icon="🍔" title="No items" description="Try again" action={<button>Retry</button>} />
    );
    expect(screen.getByText("No items")).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
