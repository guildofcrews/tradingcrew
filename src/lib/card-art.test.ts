import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  IMAGE_CREDIT,
  artCreditLine,
  canChooseOfficialArt,
  displayImageSrc,
  officialArtUrl,
  officialSetNameFromPayload,
  showingOfficialArt,
} from "./card-art";

const BLASTOISE = "https://assets.tcgdex.net/en/sv/sv03.5/184";
const CHIYU = "https://assets.tcgdex.net/en/sv/sv02/259";

const matched = {
  category: "pokemon" as const,
  tcgdexId: "sv03.5-184",
  officialImageUrl: `${BLASTOISE}/high.webp`,
  preferKidPhoto: false,
  imageUrl: "https://example.blob.vercel-storage.com/cards/kid.jpg",
};

describe("officialSetNameFromPayload", () => {
  it("reads the TCGdex set name and ignores blanks", () => {
    assert.equal(
      officialSetNameFromPayload({ set: { id: "sv08.5", name: "Prismatic Evolutions" } }),
      "Prismatic Evolutions",
    );
    assert.equal(officialSetNameFromPayload({ set: { name: "  Lost   Thunder " } }), "Lost Thunder");
    assert.equal(officialSetNameFromPayload({ set: { name: "   " } }), null);
    assert.equal(officialSetNameFromPayload({ set: { id: "sv08.5" } }), null);
    assert.equal(officialSetNameFromPayload({}), null);
    assert.equal(officialSetNameFromPayload(null), null);
  });
});

describe("officialArtUrl", () => {
  it("builds high.webp from the TCGdex image base", () => {
    assert.equal(officialArtUrl({ image: BLASTOISE }), `${BLASTOISE}/high.webp`);
    assert.equal(officialArtUrl({ image: CHIYU, pricing: { tcgplayer: {} } }), `${CHIYU}/high.webp`);
    assert.equal(officialArtUrl({ image: `${CHIYU}/low.webp` }), `${CHIYU}/high.webp`);
    assert.equal(officialArtUrl({ image: `${BLASTOISE}/high.png` }), `${BLASTOISE}/high.webp`);
    assert.equal(officialArtUrl({ image: `${BLASTOISE}/high.jpg` }), `${BLASTOISE}/high.webp`);
    assert.equal(officialArtUrl({ image: `${BLASTOISE}/` }), `${BLASTOISE}/high.webp`);
    assert.equal(officialArtUrl({ image: `${BLASTOISE}?lang=en` }), `${BLASTOISE}/high.webp`);
  });

  it("rejects hosts that are not the TCGdex asset CDN", () => {
    assert.equal(officialArtUrl({ image: "https://example.com/en/sv/sv03.5/184" }), null);
    assert.equal(officialArtUrl({ image: "http://assets.tcgdex.net/en/sv/sv03.5/184" }), null);
    assert.equal(officialArtUrl({ image: "https://assets.tcgdex.net.evil.example/en/sv/1" }), null);
    assert.equal(officialArtUrl({ image: "https://assets.tcgdex.net/high.webp" }), null);
    assert.equal(officialArtUrl({}), null);
    assert.equal(officialArtUrl(null), null);
  });
});

describe("showingOfficialArt", () => {
  it("defaults a matched Pokémon card to official art", () => {
    assert.equal(canChooseOfficialArt(matched), true);
    assert.equal(showingOfficialArt(matched), true);
    assert.equal(showingOfficialArt({ ...matched, preferKidPhoto: undefined }), true);
    assert.equal(displayImageSrc(matched), `${BLASTOISE}/high.webp`);
  });

  it("keeps the photo for an owner opt-out, an unmatched card, or a sports card", () => {
    assert.equal(showingOfficialArt({ ...matched, preferKidPhoto: true }), false);
    assert.equal(canChooseOfficialArt({ ...matched, preferKidPhoto: true }), true);
    assert.match(displayImageSrc({ ...matched, preferKidPhoto: true }), /^\/api\/images\?/);
    assert.equal(showingOfficialArt({ ...matched, tcgdexId: null }), false);
    assert.equal(canChooseOfficialArt({ ...matched, officialImageUrl: null }), false);
    assert.equal(showingOfficialArt({ ...matched, category: "basketball" }), false);
    assert.equal(canChooseOfficialArt({ ...matched, category: "baseball" }), false);
    assert.equal(showingOfficialArt({ ...matched, officialImageUrl: "https://evil.example/card.webp" }), false);
  });

  it("credits TCGdex next to the price line only while official art is showing", () => {
    assert.equal(artCreditLine("Prices via TCGdex / TCGplayer", matched), `Prices via TCGdex / TCGplayer · ${IMAGE_CREDIT}`);
    assert.equal(artCreditLine(null, matched), IMAGE_CREDIT);
    assert.equal(artCreditLine("Prices via TCGdex / TCGplayer", { ...matched, preferKidPhoto: true }), "Prices via TCGdex / TCGplayer");
    assert.equal(artCreditLine(null, { ...matched, category: "football" }), null);
  });
});
