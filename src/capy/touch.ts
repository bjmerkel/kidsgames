export type CapyTouchRead = {
  jump: boolean;
  jumpHeld: boolean;
};

export function capyTouchRead(input: {
  edgeJump: boolean;
  keyHeld: boolean;
  buttonHeld: boolean;
  fieldDown: boolean;
  fieldHeld: boolean;
}): CapyTouchRead {
  return {
    jump: input.edgeJump || input.fieldDown,
    jumpHeld: input.keyHeld || input.buttonHeld || input.fieldHeld,
  };
}
