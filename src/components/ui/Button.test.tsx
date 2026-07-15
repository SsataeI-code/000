import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

describe("house-style UI primitives", () => {
  it("renders a button with the 44px tap-target class (accessibility, §4)", () => {
    render(<Button>Sign in</Button>);
    const btn = screen.getByRole("button", { name: "Sign in" });
    expect(btn.className).toContain("min-h-tap");
    // Default type is button, never an accidental form submit.
    expect(btn.getAttribute("type")).toBe("button");
  });

  it("associates a Field's label with its input for screen readers", () => {
    render(<Field label="Email" name="email" />);
    // getByLabelText only resolves when the label is correctly associated.
    const input = screen.getByLabelText("Email");
    expect(input.tagName).toBe("INPUT");
    expect(input.getAttribute("name")).toBe("email");
  });

  it("wires a Field hint via aria-describedby", () => {
    render(<Field label="Coach code" name="coach_code" hint="Optional" />);
    const input = screen.getByLabelText("Coach code");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)?.textContent).toBe("Optional");
  });
});
