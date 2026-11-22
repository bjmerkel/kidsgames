import type { LevelTune, NamedSpeed } from "../game/tune";

type NumberField =
  | "timeLimitSec"
  | "lives"
  | "stoneSinkSec"
  | "stoneDrift"
  | "stoneTravel"
  | "stoneSize"
  | "holdBlinkSec"
  | "holdDrift"
  | "holdSize";

interface FieldSpec {
  field: NumberField;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

const TIME_FIELDS: FieldSpec[] = [
  { field: "timeLimitSec", label: "Level timer", min: 15, max: 180, step: 1, unit: "seconds" },
  { field: "lives", label: "Lives", min: 1, max: 9, step: 1, unit: "" },
];

const STONE_FIELDS: FieldSpec[] = [
  { field: "stoneSinkSec", label: "Sink time", min: 0.5, max: 60, step: 0.1, unit: "seconds" },
  { field: "stoneDrift", label: "Drift speed", min: 0, max: 200, step: 1, unit: "px/s" },
  { field: "stoneTravel", label: "Slide from the middle", min: 0, max: 220, step: 1, unit: "px" },
  { field: "stoneSize", label: "Stone size", min: 16, max: 80, step: 1, unit: "px" },
];

const HOLD_FIELDS: FieldSpec[] = [
  { field: "holdBlinkSec", label: "Blink time", min: 0.4, max: 20, step: 0.1, unit: "seconds" },
  { field: "holdDrift", label: "Hold drift", min: 0, max: 200, step: 1, unit: "px/s" },
  { field: "holdSize", label: "Hold size", min: 16, max: 80, step: 1, unit: "px" },
];

export function mountLevelSettings(
  tabs: HTMLElement,
  form: HTMLElement,
  initial: LevelTune[],
  defaults: LevelTune[],
  onChange: (tunes: LevelTune[]) => void,
): void {
  let tunes = initial.map(clone);
  let selected = tunes.find((tune) => tune.id === 2)?.id ?? tunes[0]?.id ?? 1;

  const publish = (): void => onChange(tunes.map(clone));

  const render = (): void => {
    const tune = tunes.find((item) => item.id === selected) ?? tunes[0];
    tabs.innerHTML = tunes
      .map((item) => {
        const on = item.id === tune?.id;
        return `<button type="button" data-level="${item.id}" class="${on ? "is-selected" : ""}" aria-pressed="${on}">${item.id} ${esc(shortName(item.name))}</button>`;
      })
      .join("");
    if (!tune) {
      form.innerHTML = "";
      return;
    }
    form.innerHTML = `
      <p class="tune-help">${esc(tune.name)}. Change a control, then press Play. The game starts over with these settings.</p>
      <fieldset class="tune-group">
        <legend>Time</legend>
        ${TIME_FIELDS.map((spec) => row(spec, tune[spec.field])).join("")}
      </fieldset>
      <fieldset class="tune-group">
        <legend>Stones</legend>
        <p class="tune-help">Sink time is how long you can stand on a stone before it drops. Slide from the middle is how far it wanders. About 36 px keeps a straight hop on the stone.</p>
        ${check("stonesNeverSink", "Stones never sink", tune.stonesNeverSink)}
        ${STONE_FIELDS.map((spec) => row(spec, tune[spec.field], spec.field === "stoneSinkSec" && tune.stonesNeverSink)).join("")}
      </fieldset>
      <fieldset class="tune-group">
        <legend>Holds</legend>
        ${check("holdsStay", "Holds stay visible", tune.holdsStay)}
        ${HOLD_FIELDS.map((spec) => row(spec, tune[spec.field], spec.field === "holdBlinkSec" && tune.holdsStay)).join("")}
      </fieldset>
      ${speedGroup("Cars", "Car speed", tune.cars, "car", -400, 400, 1)}
      ${speedGroup("Swings", "Swing speed", tune.swings, "swing", 0, 8, 0.1)}
      <div class="tune-actions">
        <button type="button" data-action="reset-level">Reset this level</button>
        <button type="button" data-action="reset-all">Reset all levels</button>
      </div>
    `;
  };

  tabs.addEventListener("click", (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>("button[data-level]");
    if (!button) return;
    selected = Number(button.dataset.level);
    render();
  });

  form.addEventListener("input", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const tune = tunes.find((item) => item.id === selected);
    if (!tune || !writeInput(tune, input)) return;
    mirror(form, input);
    setDisabled(form, tune);
    publish();
  });

  form.addEventListener("click", (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>("button[data-action]");
    if (!button) return;
    if (button.dataset.action === "reset-level") {
      const fresh = defaults.find((item) => item.id === selected);
      const index = tunes.findIndex((item) => item.id === selected);
      if (fresh && index >= 0) tunes[index] = clone(fresh);
    } else if (button.dataset.action === "reset-all") {
      tunes = defaults.map(clone);
    } else {
      return;
    }
    render();
    publish();
  });

  render();
}

function writeInput(tune: LevelTune, input: HTMLInputElement): boolean {
  const carId = input.dataset.car;
  if (carId) return writeSpeed(tune.cars, carId, input.value);
  const swingId = input.dataset.swing;
  if (swingId) return writeSpeed(tune.swings, swingId, input.value);
  const field = input.dataset.field;
  if (!field) return false;
  if (input.type === "checkbox") {
    if (field === "stonesNeverSink" || field === "holdsStay") tune[field] = input.checked;
    return true;
  }
  if (input.value.trim() === "") return false;
  const value = Number(input.value);
  if (!Number.isFinite(value) || !isNumberField(field)) return false;
  tune[field] = value;
  return true;
}

function writeSpeed(items: NamedSpeed[], id: string, raw: string): boolean {
  if (raw.trim() === "") return false;
  const value = Number(raw);
  const item = items.find((entry) => entry.id === id);
  if (!item || !Number.isFinite(value)) return false;
  item.value = value;
  return true;
}

function mirror(form: HTMLElement, input: HTMLInputElement): void {
  const match = (other: HTMLInputElement): boolean =>
    other !== input &&
    other.dataset.field === input.dataset.field &&
    other.dataset.car === input.dataset.car &&
    other.dataset.swing === input.dataset.swing;
  form.querySelectorAll<HTMLInputElement>("input").forEach((other) => {
    if (match(other) && other.type !== "checkbox") other.value = input.value;
  });
  const key = input.dataset.car ? `car:${input.dataset.car}` : input.dataset.swing ? `swing:${input.dataset.swing}` : input.dataset.field;
  const readout = key ? form.querySelector(`[data-readout="${CSS.escape(key)}"]`) : null;
  if (readout && input.type !== "checkbox") readout.textContent = input.value;
}

function setDisabled(form: HTMLElement, tune: LevelTune): void {
  form.querySelectorAll<HTMLInputElement>("[data-field='stoneSinkSec']").forEach((input) => {
    input.disabled = tune.stonesNeverSink;
  });
  form.querySelectorAll<HTMLInputElement>("[data-field='holdBlinkSec']").forEach((input) => {
    input.disabled = tune.holdsStay;
  });
}

function row(spec: FieldSpec, value: number, disabled = false): string {
  const shown = format(value, spec.step);
  const off = disabled ? " disabled" : "";
  return `<label class="tune-row">
    <span>${esc(spec.label)} <strong data-readout="${spec.field}">${shown}</strong>${spec.unit ? ` ${esc(spec.unit)}` : ""}</span>
    <input type="range" min="${spec.min}" max="${spec.max}" step="${spec.step}" data-field="${spec.field}" value="${shown}" aria-label="${esc(spec.label)}"${off}>
    <input type="number" min="${spec.min}" max="${spec.max}" step="${spec.step}" data-field="${spec.field}" value="${shown}" aria-label="${esc(spec.label)}"${off}>
  </label>`;
}

function check(field: "stonesNeverSink" | "holdsStay", label: string, checked: boolean): string {
  return `<label class="tune-check"><input type="checkbox" data-field="${field}" ${checked ? "checked" : ""}> ${esc(label)}</label>`;
}

function speedGroup(title: string, label: string, items: NamedSpeed[], kind: "car" | "swing", min: number, max: number, step: number): string {
  if (items.length === 0) return "";
  const rows = items
    .map((item) => {
      const shown = format(item.value, step);
      const attr = kind === "car" ? `data-car="${esc(item.id)}"` : `data-swing="${esc(item.id)}"`;
      return `<label class="tune-row">
        <span>${esc(item.label)} <strong data-readout="${kind}:${esc(item.id)}">${shown}</strong></span>
        <input type="range" min="${min}" max="${max}" step="${step}" ${attr} value="${shown}" aria-label="${esc(item.label)} ${label}">
        <input type="number" min="${min}" max="${max}" step="${step}" ${attr} value="${shown}" aria-label="${esc(item.label)} ${label}">
      </label>`;
    })
    .join("");
  return `<fieldset class="tune-group"><legend>${title}</legend>${rows}</fieldset>`;
}

function isNumberField(field: string): field is NumberField {
  return (
    field === "timeLimitSec" ||
    field === "lives" ||
    field === "stoneSinkSec" ||
    field === "stoneDrift" ||
    field === "stoneTravel" ||
    field === "stoneSize" ||
    field === "holdBlinkSec" ||
    field === "holdDrift" ||
    field === "holdSize"
  );
}

function format(value: number, step: number): string {
  const places = step < 1 ? 1 : 0;
  return value.toFixed(places);
}

function shortName(name: string): string {
  return name.replace(/^Emery's /, "");
}

function esc(text: string): string {
  return text.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch] ?? ch);
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
