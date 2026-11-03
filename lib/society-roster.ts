import type { Candidate } from "./types";
const key = (name: string) =>
  name
    .normalize("NFKC")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
// Explicit roster aliases, not fuzzy matching: related chapters/teams stay separate.
const aliases = [
  [
    "Biomedical Engineering Society",
    "Biomedical Engineering Society (BMES)",
    "BMES",
  ],
  [
    "Chemical Engineering Graduate Student Association",
    "Chemical Engineering Graduate Student Association (ChEGSA)",
    "ChEGSA",
  ],
  ["Society of Women Engineers", "Society of Women Engineers (SWE-TAMU)"],
  ["Society of Mechatronics Technology", "SOMTECH"],
  ["Women in Mechanical Engineering (MEEN Girls)", "MEEN Girls"],
  ["Karura Robotics", "Karura"],
  ["SAE Aero Design", "Sae aero"],
  [
    "Texas A&M University Rocket Engine Design",
    "Texas A&M Rocket Engine Design",
  ],
  ["The Fab Lab", "Tamu Fab Lab"],
  ["Institute of Electrical and Electronics Engineers", "IEEE TAMU"],
];
const canonical = new Map(
  aliases.flatMap((names) =>
    names.map((name) => [key(name), names[0]] as const),
  ),
);
export type RosterGroup = { id: string; name: string; responses: Candidate[] };
export function groupSocietyRoster(rows: Candidate[]): RosterGroup[] {
  const groups = new Map<string, RosterGroup>();
  for (const response of rows) {
    const name = canonical.get(key(response.name)) ?? response.name.trim();
    const id = key(name);
    const group = groups.get(id) ?? { id, name, responses: [] };
    group.responses.push(response);
    groups.set(id, group);
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}
export function rosterGroupMatches(group: RosterGroup, query: string) {
  const search = query.trim().toLowerCase();
  return `${group.name} ${group.responses.map((r) => `${r.name} ${JSON.stringify(r.contacts)}`).join(" ")}`
    .toLowerCase()
    .includes(search);
}
