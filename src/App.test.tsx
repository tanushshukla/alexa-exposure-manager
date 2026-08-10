import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("Alexa Exposure Manager", () => {
  it("updates an entity override and reflects it in the YAML preview", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByPlaceholderText("Search entity or device…"), "coffee machine");
    expect(screen.getByText("switch.coffee_machine")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Hide entity" }));
    expect(screen.getByText("Explicitly hidden")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /YAML preview/ }));
    expect(screen.getByText(/exclude_entities:[\s\S]*switch\.coffee_machine/)).toBeInTheDocument();
  });
});
