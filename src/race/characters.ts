export type Character = {
  id: string;
  name: string;
  species: string;
  speed: number;
  accel: number;
  turn: number;
  body: string;
  head: string;
  accent: string;
  belly: string;
};

export const CHARACTERS: Character[] = [
  { id: "woody", name: "Woody", species: "Wood Duck", speed: 330, accel: 250, turn: 2.5, body: "#8d97a3", head: "#1f7a4d", accent: "#f7f4ee", belly: "#b5522a" },
  { id: "clover", name: "Clover", species: "Rabbit", speed: 305, accel: 340, turn: 2.7, body: "#f3efe6", head: "#f7f3ea", accent: "#e7b7c6", belly: "#f7f3ea" },
  { id: "nib", name: "Nib", species: "Squirrel", speed: 315, accel: 260, turn: 3.05, body: "#c47a3a", head: "#a8652c", accent: "#f2d2a2", belly: "#f0c9a0" },
  { id: "bandit", name: "Bandit", species: "Raccoon", speed: 328, accel: 235, turn: 2.35, body: "#6d7278", head: "#4e545b", accent: "#1c1915", belly: "#d9d3c7" },
  { id: "ember", name: "Ember", species: "Fox", speed: 358, accel: 200, turn: 2.05, body: "#e07a32", head: "#c4622d", accent: "#f4f1ea", belly: "#f7f1e6" },
  { id: "luna", name: "Luna", species: "Owl", speed: 336, accel: 210, turn: 2.55, body: "#c7b89a", head: "#8d7b58", accent: "#f2c14e", belly: "#f7f1e6" },
  { id: "aspen", name: "Aspen", species: "Deer", speed: 348, accel: 185, turn: 1.95, body: "#c48a4a", head: "#a8743a", accent: "#f0d8b0", belly: "#e7c99a" },
  { id: "burr", name: "Burr", species: "Hedgehog", speed: 300, accel: 220, turn: 2.85, body: "#8a6244", head: "#6e4c34", accent: "#efe6d6", belly: "#efe6d6" },
  { id: "chip", name: "Chip", species: "Chipmunk", speed: 310, accel: 290, turn: 3.15, body: "#d0894a", head: "#a86b32", accent: "#f4e2c4", belly: "#f7f1e6" },
  { id: "cedar", name: "Cedar", species: "Beaver", speed: 318, accel: 175, turn: 1.82, body: "#7a5340", head: "#5e4032", accent: "#e7d3b0", belly: "#c4a574" },
];

export function characterById(id: string): Character {
  return CHARACTERS.find((character) => character.id === id) ?? CHARACTERS[0];
}
