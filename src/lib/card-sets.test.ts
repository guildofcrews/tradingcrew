import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Card } from "./cards";
import { displayQuery, galleryHref, groupCardsBySet, OTHER_SET_NAME, parseCardDisplay, resolvePokemonBrowse } from "./card-sets";

function card(partial: Partial<Card> & Pick<Card, "id">): Card {
  return {
    title: partial.title ?? partial.id,
    imageUrl: "",
    category: "pokemon",
    createdAt: partial.createdAt ?? "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("groupCardsBySet", () => {
  it("groups a matched TCGdex set even when the printed names disagree", () => {
    const groups = groupCardsBySet([
      card({
        id: "a",
        tcgdexId: "sv08.5-1",
        officialSetName: "Prismatic Evolutions",
        setName: "SVI",
        setCode: "PRE",
        createdAt: "2026-02-01T00:00:00.000Z",
      }),
      card({
        id: "b",
        tcgdexId: "sv08.5-2",
        setName: "Something else",
        setCode: "PRE",
        createdAt: "2026-03-01T00:00:00.000Z",
      }),
      card({
        id: "loose",
        setName: "Prismatic Evolutions",
      }),
    ]);

    assert.equal(groups.length, 2);
    assert.equal(groups[0]?.id, "m:sv08.5");
    assert.equal(groups[0]?.name, "Prismatic Evolutions");
    assert.equal(groups[0]?.eyebrow, "PRE");
    assert.deepEqual(
      groups[0]?.cards.map((item) => item.id),
      ["b", "a"],
    );
    assert.equal(groups[1]?.id, "n:prismatic evolutions");
    assert.equal(groups[1]?.cards.length, 1);
  });

  it("keeps a dotted set id such as sv03.5", () => {
    const groups = groupCardsBySet([
      card({ id: "blastoise", tcgdexId: "sv03.5-184", setName: "151" }),
    ]);
    assert.equal(groups[0]?.id, "m:sv03.5");
    assert.equal(groups[0]?.name, "151");
  });

  it("falls back to the stored set name, then the code, then the set id", () => {
    const byName = groupCardsBySet([
      card({ id: "1", tcgdexId: "swsh8-46", setName: "Fusion Strike" }),
      card({ id: "2", tcgdexId: "swsh8-189", setName: "Fusion Strike" }),
      card({ id: "3", tcgdexId: "swsh8-10", setName: "Brilliant Stars" }),
    ]);
    assert.equal(byName[0]?.name, "Fusion Strike");

    const byCode = groupCardsBySet([
      card({ id: "1", tcgdexId: "swsh8-46", setCode: "FST" }),
    ]);
    assert.equal(byCode[0]?.name, "FST");
    assert.equal(byCode[0]?.eyebrow, "FST");

    const byId = groupCardsBySet([card({ id: "1", tcgdexId: "me01-23" })]);
    assert.equal(byId[0]?.name, "me01");
    assert.equal(byId[0]?.eyebrow, "Set");
  });

  it("groups unmatched cards by stored name or code, and parks the rest in Other", () => {
    const groups = groupCardsBySet([
      card({ id: "a", setName: "Fusion  Strike" }),
      card({ id: "b", setName: "fusion strike" }),
      card({ id: "c", setCode: "SFA" }),
      card({ id: "d", setCode: "sfa" }),
      card({ id: "e", setName: "   " }),
      card({ id: "f" }),
    ]);

    assert.deepEqual(
      groups.map((group) => [group.id, group.name, group.cards.length]),
      [
        ["n:fusion strike", "Fusion Strike", 2],
        ["other", OTHER_SET_NAME, 2],
        ["c:sfa", "SFA", 2],
      ],
    );
    assert.equal(groups.find((group) => group.id === "other")?.eyebrow, "Unsorted");
  });

  it("orders doors by size, then name", () => {
    const groups = groupCardsBySet([
      card({ id: "1", setName: "Zebra" }),
      card({ id: "2", setName: "Alpha" }),
      card({ id: "3", setName: "Alpha" }),
      card({ id: "4", setName: "Middle" }),
      card({ id: "5", setName: "Middle" }),
    ]);
    assert.deepEqual(
      groups.map((group) => group.name),
      ["Alpha", "Middle", "Zebra"],
    );
  });

  it("hides the set code when the cards disagree", () => {
    const groups = groupCardsBySet([
      card({ id: "1", setName: "Mixed", setCode: "AAA" }),
      card({ id: "2", setName: "Mixed", setCode: "BBB" }),
    ]);
    assert.equal(groups[0]?.eyebrow, "Set");
  });
});

describe("resolvePokemonBrowse", () => {
  const cards = [
    card({ id: "1", setName: "Alpha" }),
    card({ id: "2", setName: "Alpha" }),
    card({ id: "3", setName: "Beta" }),
  ];

  it("starts on the doors and opens a set from the query", () => {
    const doors = resolvePokemonBrowse(cards, {});
    assert.equal(doors.mode, "doors");
    assert.equal(doors.active, null);

    const open = resolvePokemonBrowse(cards, { set: "n:alpha" });
    assert.equal(open.mode, "cards");
    assert.equal(open.active?.name, "Alpha");
    assert.deepEqual(
      open.cards.map((item) => item.id),
      ["1", "2"],
    );
    assert.deepEqual(open.preserve, { set: "n:alpha" });
  });

  it("uses the flat list for view=all and ignores an unknown set", () => {
    const all = resolvePokemonBrowse(cards, { view: "all" });
    assert.equal(all.mode, "cards");
    assert.equal(all.active, null);
    assert.equal(all.cards.length, 3);
    assert.deepEqual(all.preserve, { view: "all" });

    const missing = resolvePokemonBrowse(cards, { set: "m:nope" });
    assert.equal(missing.mode, "doors");
  });

  it("keeps a shared set link ahead of view=all", () => {
    const both = resolvePokemonBrowse(cards, { set: "n:beta", view: "all" });
    assert.equal(both.active?.id, "n:beta");
    assert.equal(both.cards.length, 1);
  });
});

describe("galleryHref", () => {
  it("keeps the set or the all-cards view when the sort changes", () => {
    assert.equal(galleryHref("/my-cards/pokemon", { set: "m:sv03.5" }), "/my-cards/pokemon?set=m%3Asv03.5");
    assert.equal(
      galleryHref("/my-cards/pokemon", { set: "n:fusion strike" }, "value"),
      "/my-cards/pokemon?set=n%3Afusion+strike&sort=value",
    );
    assert.equal(galleryHref("/my-cards/pokemon", { view: "all" }, "az"), "/my-cards/pokemon?view=all&sort=az");
    assert.equal(galleryHref("/my-cards/pokemon", { view: "all" }), "/my-cards/pokemon?view=all");
    assert.equal(galleryHref("/my-cards/pokemon", {}), "/my-cards/pokemon");
    assert.equal(
      galleryHref("/my-cards/pokemon", { set: "m:sv08", display: "carousel" }, "value"),
      "/my-cards/pokemon?set=m%3Asv08&display=carousel&sort=value",
    );
    assert.equal(
      galleryHref("/my-cards/pokemon", { view: "all", ...displayQuery("room") }, "value"),
      "/my-cards/pokemon?view=all&display=room&sort=value",
    );
  });
});

describe("parseCardDisplay", () => {
  it("keeps carousel and room, and treats anything else as the grid", () => {
    assert.equal(parseCardDisplay("carousel"), "carousel");
    assert.equal(parseCardDisplay("room"), "room");
    assert.equal(parseCardDisplay(undefined), "grid");
    assert.equal(parseCardDisplay("grid"), "grid");
    assert.equal(parseCardDisplay("coverflow"), "grid");
    assert.deepEqual(displayQuery("grid"), {});
    assert.deepEqual(displayQuery("room"), { display: "room" });
  });
});
