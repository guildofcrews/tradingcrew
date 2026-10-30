import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Card } from "./cards";
import { getWing } from "./cards";
import { cardsInWing, countByWing, digitalCountLabel } from "./cards";
import {
  categoryHallRooms,
  hallStartFromQuery,
  legacyHallsRedirect,
  libraryCrumbs,
  mainHallRooms,
  mainHallVault,
  parseHallPose,
  pickFeaturedCard,
  vaultHallRooms,
} from "./library-hall";

function card(partial: Partial<Card> & Pick<Card, "id">): Card {
  return {
    title: partial.title ?? partial.id,
    imageUrl: partial.imageUrl ?? "https://example.test/card.jpg",
    category: partial.category ?? "pokemon",
    createdAt: partial.createdAt ?? "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("legacyHallsRedirect", () => {
  it("sends the old hall to the category hall and keeps a set as the doorway", () => {
    assert.equal(legacyHallsRedirect({}, "pokemon", { view: "sets" }), null);
    assert.equal(legacyHallsRedirect({}, "pokemon", { view: "halls" }), "/library/pokemon");
    assert.equal(legacyHallsRedirect({}, "pokemon", { view: "halls", at: "4" }), "/library/pokemon");
    assert.equal(
      legacyHallsRedirect({}, "pokemon", { view: "halls", set: "n:crown zenith", at: "3" }),
      "/library/pokemon?at=n%3Acrown+zenith",
    );
    assert.equal(
      legacyHallsRedirect({ ownerId: "ada" }, "baseball", { view: "halls" }),
      "/shared/ada/library/baseball",
    );
  });
});

describe("parseHallPose", () => {
  it("reads z, look, and rev, and lets a pose win over ?at=", () => {
    assert.equal(parseHallPose({}), undefined);
    assert.equal(parseHallPose({ look: "-20" }), undefined);
    assert.equal(parseHallPose({ z: "nope" }), undefined);
    assert.deepEqual(parseHallPose({ z: "500" }), { z: 500, look: 0, rev: false });
    assert.deepEqual(parseHallPose({ z: "500", look: "-20", rev: "1" }), { z: 500, look: -20, rev: true });
    assert.deepEqual(hallStartFromQuery({ z: "320", look: "20", at: "room-4" }), {
      initialPose: { z: 320, look: 20, rev: false },
    });
    assert.deepEqual(hallStartFromQuery({ at: "room-4" }), { initialRoomId: "room-4" });
    assert.deepEqual(hallStartFromQuery({}), {});
  });
});

describe("library crumbs and rooms", () => {
  it("builds Library › wing › set, and returns to the same doorway", () => {
    const wing = getWing("pokemon");
    assert.ok(wing);
    assert.deepEqual(libraryCrumbs({}), [{ label: "Library" }]);
    assert.deepEqual(libraryCrumbs({}, wing), [
      { label: "Library", href: "/library?at=pokemon" },
      { label: "Pokémon" },
    ]);
    assert.equal(libraryCrumbs({ ownerId: "ada" }, wing, { id: "m:sv08", name: "Surging Sparks" })[1]?.href, "/shared/ada/library/pokemon?at=m%3Asv08");
  });

  it("lists the four wings and adds Uncategorized only when a card has no wing", () => {
    const rooms = mainHallRooms([
      card({ id: "p", category: "pokemon", title: "Pikachu" }),
      card({ id: "loose", category: null, title: "Mystery" }),
    ]);
    assert.deepEqual(
      rooms.map((room) => room.id),
      ["pokemon", "basketball", "football", "baseball", "uncategorized"],
    );
    assert.equal(rooms[0]?.href, "/library/pokemon");
    assert.equal(rooms[4]?.countLabel, "1 card");
    assert.equal(mainHallRooms([card({ id: "p" })]).some((room) => room.id === "uncategorized"), false);
  });

  it("groups a sports wing by the set already stored on the card", () => {
    const wing = getWing("baseball");
    assert.ok(wing);
    const rooms = categoryHallRooms(wing, [
      card({ id: "a", category: "baseball", setName: "Topps Chrome", title: "Ace", createdAt: "2026-03-01T00:00:00.000Z" }),
      card({ id: "b", category: "baseball", setName: "Topps Chrome", title: "Rookie", createdAt: "2026-02-01T00:00:00.000Z" }),
      card({ id: "c", category: "baseball", setName: "Stadium Club", title: "Bat" }),
    ], { ownerId: "ada" });
    assert.deepEqual(rooms.map((room) => room.name), ["Topps Chrome", "Stadium Club"]);
    assert.equal(rooms[0]?.eyebrow, "Baseball");
    assert.equal(rooms[0]?.countLabel, "2 cards");
    assert.match(rooms[0]?.href ?? "", /\/shared\/ada\/baseball\?/);
    assert.match(rooms[0]?.href ?? "", /display=room/);
    assert.match(rooms[0]?.href ?? "", /from=hall/);
  });

  it("keeps a digital card in its sport and lists it once in the vault", () => {
    const cards = [
      card({ id: "phys", category: "basketball", kind: "physical", title: "LeBron" }),
      card({
        id: "nft",
        category: "basketball",
        kind: "digital",
        platform: "nba_top_shot",
        title: "AJ Dybantsa Dunk",
      }),
      card({
        id: "sorare",
        category: "football",
        kind: "digital",
        platform: "sorare",
        title: "Anselmo MacNulty",
      }),
    ];
    assert.equal(cardsInWing(cards, "basketball").length, 2);
    assert.equal(cardsInWing(cards, "football").length, 1);
    assert.equal(cardsInWing(cards, "digital-vault").length, 2);
    assert.equal(countByWing(cards).basketball + countByWing(cards).football, 3);
    assert.equal(cards.length, 3);
    assert.equal(digitalCountLabel(1), "1 digital card");

    const rooms = vaultHallRooms(cards, { ownerId: "ada" });
    assert.deepEqual(rooms.map((room) => room.name), ["NBA Top Shot", "Sorare"]);
    assert.equal(rooms[0]?.countLabel, "1 digital card");
    assert.match(rooms[0]?.href ?? "", /^\/shared\/ada\/digital-vault\?/);
    assert.match(rooms[0]?.href ?? "", /collection=nba_top_shot/);
    assert.match(rooms[0]?.href ?? "", /display=room/);
    assert.match(rooms[0]?.href ?? "", /from=hall/);
    assert.equal(mainHallVault({}, 1).href, "/library/digital-vault");
    assert.equal(vaultHallRooms([card({ id: "phys", kind: "physical" })]).length, 0);
  });

  it("features the highest priced card", () => {
    const pricey = card({
      id: "rare",
      title: "Rare",
      createdAt: "2026-01-01T00:00:00.000Z",
      price: {
        headline: "$4.00",
        detail: null,
        secondary: null,
        credit: null,
        choices: [],
        selectedVariant: null,
        marketUsd: 4,
        sourceUpdatedAt: null,
      },
    });
    const fresh = card({ id: "new", title: "New", createdAt: "2026-06-01T00:00:00.000Z" });
    assert.equal(pickFeaturedCard([fresh, pricey])?.id, "rare");
    assert.equal(pickFeaturedCard([fresh])?.id, "new");
  });
});
