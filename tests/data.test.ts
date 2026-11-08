import { describe, expect, it } from "vitest";
import { validateData } from "../src/lib/validate";
import { places, taxonomy } from "./helpers";

describe("places.json", () => {
  it("passes the validator", () => {
    expect(validateData(places, taxonomy)).toEqual([]);
  });
  it("has 79 places and the documented flag counts", () => {
    expect(places).toHaveLength(79);
    expect(places.filter((p) => p.opensByNineAm)).toHaveLength(15);
    expect(places.filter((p) => p.opensLate)).toHaveLength(14);
  });
  it("validator catches problems", () => {
    const bad = structuredClone(places);
    bad[0].tags.push("Nope");
    bad[1].lat = 40;
    bad[2].area = "Atlantis";
    bad[3].id = 99;
    const errs = validateData(bad, taxonomy).join("\n");
    expect(errs).toMatch(/unknown tag "Nope"/);
    expect(errs).toMatch(/out of bounds/);
    expect(errs).toMatch(/unknown area/);
    expect(errs).toMatch(/not contiguous/);
  });
});
