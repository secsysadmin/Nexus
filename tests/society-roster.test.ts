import test from "node:test";
import assert from "node:assert/strict";
import { groupSocietyRoster, rosterGroupMatches } from "../lib/society-roster";
const row = (id: string, name: string, email = "") => ({
  id,
  name,
  source_timestamp: "11/03/2026",
  contacts: { email },
});
test("grouping preserves all contacts and response IDs across case, spacing, and known aliases", () => {
  const groups = groupSocietyRoster([
    row("1", "  Karura "),
    row("2", "KARURA"),
    row("3", "Karura Robotics", "third@example.invalid"),
    row("4", "Chemical Engineering Graduate Student Association"),
    row("5", "ChEGSA"),
  ]);
  assert.equal(groups.length, 2);
  const karura = groups.find((g) => g.name === "Karura Robotics")!;
  assert.deepEqual(
    karura.responses.map((r) => r.id),
    ["1", "2", "3"],
  );
  assert.equal(rosterGroupMatches(karura, "third@example.invalid"), true);
  assert.equal(rosterGroupMatches(groups[0], "ChEGSA"), true);
});
test("related chapters and teams are not merged by acronym or fuzzy similarity", () => {
  const groups = groupSocietyRoster([
    row("1", "IEEE TAMU"),
    row("2", "Institute of Electrical and Electronics Engineers"),
    row(
      "3",
      "IEEE Microwave Theory and Technology Society at Texas A&M University",
    ),
    row("4", "SAE Aero Design"),
    row("5", "Society of Automotive Engineers"),
  ]);
  assert.equal(groups.length, 4);
  assert.equal(
    groups.find(
      (g) => g.name === "Institute of Electrical and Electronics Engineers",
    )!.responses.length,
    2,
  );
});
