import { describe, expect, it } from "vitest";
import { classifyGnarsDiscipline } from "./keywords";

describe("classifyGnarsDiscipline", () => {
  it("classifies unambiguous skate vocabulary", () => {
    expect(classifyGnarsDiscipline("Joseph do a kickflip")).toBe("skate");
    expect(classifyGnarsDiscipline("Frontside boardslide on the red rail")).toBe("skate");
  });

  it("classifies unambiguous surf vocabulary", () => {
    expect(classifyGnarsDiscipline("Get barreled on a glassy wave")).toBe("surf");
  });

  it("does not classify on common English alone", () => {
    // "set" is surf vocabulary (a set of waves) and also completely ordinary —
    // this bounty was being dealt as the homepage's headline SURF card.
    expect(
      classifyGnarsDiscipline(
        "local AI challenge: AI image detector for Chrome. The benchmark consists of a held-out set of real and AI-generated images.",
      ),
    ).not.toBe("surf");

    // "park" and "street" likewise cannot make a litter pick-up into skating.
    expect(classifyGnarsDiscipline("Clean a local green space in the park")).not.toBe("skate");
    expect(classifyGnarsDiscipline("Best sunrise shot from your street")).not.toBe("skate");
  });

  it("still classifies when an ambiguous word is corroborated", () => {
    expect(classifyGnarsDiscipline("Kickflip in the park")).toBe("skate");
    expect(classifyGnarsDiscipline("Paddle out and catch the set")).toBe("surf");
  });

  it("keeps a skate trick from being read as parkour", () => {
    // Bare "flip" is parkour vocabulary, but it also sits inside skate trick
    // names as its own word; "impossible" is the specific signal here.
    expect(classifyGnarsDiscipline("impossible late flip for poidh 🛹")).toBe("skate");
    expect(classifyGnarsDiscipline("Kong vault to precision")).toBe("parkour");
  });

  it("returns null when nothing in the vocabulary matches", () => {
    expect(classifyGnarsDiscipline("Write documentation for the API")).toBeNull();
  });
});
