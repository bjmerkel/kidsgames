import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COPY, screenText } from "../src/game/copy";
import type { LevelDef, Phase } from "../src/game/types";

const sampleLevel = {
  name: "Emery's Driveway",
  intro: "Hot Wheels, stones, swings, and a wall. Then the tunnel. Emery is awesome.",
} as LevelDef;

describe("Emery is awesome throughout", () => {
  const phases: Phase[] = ["title", "intro", "playing", "paused", "level-clear", "campaign-clear", "retry"];

  it("puts the exact phrase on every screen", () => {
    for (const phase of phases) {
      expect(screenText(phase, sampleLevel)).toContain(COPY.emery);
    }
  });

  it("congratulates a finished level and a finished campaign", () => {
    expect(screenText("level-clear", sampleLevel)).toContain(COPY.finishedLevel);
    expect(screenText("campaign-clear", sampleLevel)).toContain(COPY.finishedLevel);
    expect(screenText("campaign-clear", sampleLevel)).toContain(COPY.finishedAll);
  });

  it("keeps the phrase on the page and in the standing lines", () => {
    expect(sampleLevel.intro).toContain(COPY.emery);
    expect(readFileSync("index.html", "utf8")).toContain(COPY.emery);
    expect(COPY.tunnel).toContain(COPY.emery);
    expect(COPY.tryAgain).toContain(COPY.emery);
    expect(COPY.timeUp).toContain(COPY.emery);
  });
});