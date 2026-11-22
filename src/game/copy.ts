import type { LevelDef, Phase } from "./types";

export const COPY = {
  emery: "Emery is awesome",
  title: "Hermit Crab Crossing",
  finishedLevel: "You finished the level!",
  finishedAll: "You finished all 5 levels.",
  tryAgain: "Try again. Emery is awesome.",
  timeUp: "Time's up. Try again. Emery is awesome.",
  tryLevel: "Try the level again",
  paused: "Paused",
  tunnel: "Into the tunnel. Emery is awesome.",
  play: "Play",
  next: "Next level",
  again: "Play again",
  continue: "Continue",
  lives: "Lives",
  score: "Score",
  time: "Time",
};

export function screenText(phase: Phase, level: LevelDef): string {
  switch (phase) {
    case "title":
      return `${COPY.title}. ${COPY.emery}. ${COPY.play}.`;
    case "intro":
      return `${level.name}. ${level.intro}`;
    case "playing":
      return `${COPY.emery}. ${level.name}. ${COPY.lives}. ${COPY.score}. ${COPY.time}. ${COPY.tunnel}`;
    case "paused":
      return `${COPY.paused}. ${COPY.emery}.`;
    case "level-clear":
      return `${COPY.finishedLevel} ${COPY.emery}.`;
    case "campaign-clear":
      return `${COPY.finishedLevel} ${COPY.finishedAll} ${COPY.emery}.`;
    case "retry":
      return `${COPY.tryLevel}. ${COPY.emery}.`;
  }
}

export function continueLabel(phase: Phase): string {
  if (phase === "title") return COPY.play;
  if (phase === "level-clear") return COPY.next;
  if (phase === "campaign-clear" || phase === "retry") return COPY.again;
  return COPY.continue;
}