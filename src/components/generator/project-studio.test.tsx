/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProjectStudio } from "./project-studio";

afterEach(() => {
  cleanup();
});

const project = {
  id: "11111111-1111-1111-1111-111111111111",
  business_name: "Merge Smoke Studio",
  tagline: "Post-merge check",
  style: "modern",
  industry: "Design",
  status: "draft",
};

const sampleConcept = {
  id: "22222222-2222-2222-2222-222222222222",
  title: "modern icon-left 1",
  prompt: "Logo for Merge Smoke Studio",
  svg_markup:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><text x="40" y="80">Sample</text></svg>',
  layout: "icon-left",
  palette: { primary: "#1F4D45", secondary: "#B08A4F" },
  icon_concept: "geometric monogram",
  is_selected: false,
};

describe("ProjectStudio generate actions", () => {
  it("shows one generate button for a new empty project", () => {
    render(<ProjectStudio project={project} initialConcepts={[]} />);

    const generateButtons = screen.getAllByRole("button", { name: "Generate concepts" });
    expect(generateButtons).toHaveLength(1);
    expect(screen.getByTestId("empty-generate-state")).toBeTruthy();
    expect(screen.getByTestId("empty-generate-button")).toBeTruthy();
    expect(screen.queryByTestId("header-generate-actions")).toBeNull();
    expect(screen.queryByRole("button", { name: "Regenerate" })).toBeNull();
  });

  it("shows header generate-again actions once concepts exist", () => {
    render(<ProjectStudio project={project} initialConcepts={[sampleConcept]} />);

    expect(screen.getByTestId("header-generate-actions")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Generate concepts" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Regenerate" })).toBeTruthy();
    expect(screen.queryByTestId("empty-generate-state")).toBeNull();
    expect(screen.getAllByRole("button", { name: "Generate concepts" })).toHaveLength(1);
  });
});
