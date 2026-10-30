import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseNftUrl } from "./allowlist";
import { manualDigitalDraft } from "./manual";
import { draftFromMomentPage, draftFromSorare } from "./page";
import { sanitizeText } from "./sanitize";
import { acceptedSwapButton, acceptedSwapLead, digitalTradeNote } from "./trade-copy";

const TOP_SHOT_HTML = `
<title>Ignored</title>
<meta property="og:title" content="AJ Dybantsa Dunk - COMMON #2/500"/>
<meta name="description" content="AJ Dybantsa Dunk Moment from Washington Wizards. COMMON tier, serial #2 of 500."/>
<section aria-label="Edition tags"><a href="/sets/281?seriesId=9"><span>Rookie Debut (Series 2026-27)</span></a></section>
<img src="https://assets.nbatopshot.com/media/53013733?type=player&amp;format=webp"/>
`;

const ALL_DAY_HTML = `
<meta property="og:title" content="Marquise Brown Reception - COMMON"/>
<meta name="description" content="Marquise Brown Reception Moment from Arizona Cardinals. COMMON tier, 7000 total supply."/>
<section aria-label="Edition tags"><a href="/sets/32?seriesId=3"><span>Inside the Pylons (Series 2)</span></a></section>
<img src="https://media.nflallday.com/editions/1390/media/image?format=webp"/>
`;

describe("parseNftUrl", () => {
  it("accepts the three official collections and drops extra query text", () => {
    const topShot = parseNftUrl("https://www.nbatopshot.com/moment/53013733?ref=mail");
    assert.equal(topShot.ok && topShot.link.sourceUrl, "https://nbatopshot.com/moment/53013733");
    const allDay = parseNftUrl("https://nflallday.com/listing/moment/1390");
    assert.equal(allDay.ok && allDay.link.sourceUrl, "https://nflallday.com/edition/1390");
    const sorare = parseNftUrl("https://sorare.com/football/cards/anselmo-garcia-mcnulty-2026-unique-1");
    assert.equal(sorare.ok && sorare.link.platform, "sorare");
    assert.equal(sorare.ok && sorare.link.tokenId, "anselmo-garcia-mcnulty-2026-unique-1");
  });

  it("rejects other sites and Pokémon links", () => {
    assert.equal(parseNftUrl("https://opensea.io/item/1").ok, false);
    const pokemon = parseNftUrl("https://magiceden.us/pokemon-card");
    assert.equal(pokemon.ok, false);
    if (!pokemon.ok) assert.match(pokemon.message, /Pokémon/);
    assert.equal(parseNftUrl("https://nbatopshot.com/packs").ok, false);
    assert.equal(parseNftUrl("http://nbatopshot.com/moment/1").ok, false);
  });
});

describe("public page metadata", () => {
  it("reads a Top Shot moment and an ALL DAY edition", () => {
    const moment = draftFromMomentPage({
      platform: "nba_top_shot",
      tokenId: "53013733",
      sourceUrl: "https://nbatopshot.com/moment/53013733",
      html: TOP_SHOT_HTML,
    });
    assert.equal(moment?.title, "AJ Dybantsa Dunk");
    assert.equal(moment?.setName, "Rookie Debut (Series 2026-27)");
    assert.equal(moment?.serial, "#2/500");
    assert.equal(moment?.category, "basketball");
    assert.match(moment?.imageUrl ?? "", /^https:\/\/assets\.nbatopshot\.com\/media\/53013733/);

    const edition = draftFromMomentPage({
      platform: "nfl_all_day",
      tokenId: "1390",
      sourceUrl: "https://nflallday.com/edition/1390",
      html: ALL_DAY_HTML,
    });
    assert.equal(edition?.title, "Marquise Brown Reception");
    assert.equal(edition?.setName, "Inside the Pylons (Series 2)");
    assert.equal(edition?.serial, "Edition of 7000");
    assert.equal(edition?.category, "football");
  });

  it("ignores a shell page and strips tags from Sorare text", () => {
    const empty = draftFromMomentPage({
      platform: "nfl_all_day",
      tokenId: "1390",
      sourceUrl: "https://nflallday.com/moment/1390",
      html: `<meta property="og:title" content="Moment #1390"/><meta name="description" content="COLLECT THE BEST MOMENTS"/>`,
    });
    assert.equal(empty, null);

    const card = draftFromSorare(
      {
        sport: "FOOTBALL",
        name: "<b>Anselmo</b>",
        pictureUrl: "https://assets.sorare.com/card/abc/picture/tinified.png",
        serialNumber: 1,
        supply: 1,
        seasonYear: 2026,
        cardEditionName: "classic",
        assetId: "0xabc",
        anyPlayer: { displayName: "Anselmo MacNulty" },
      },
      "https://sorare.com/football/cards/anselmo",
    );
    assert.equal(card?.title, "Anselmo MacNulty");
    assert.equal(card?.category, "football");
    assert.equal(card?.setName, "2025-26 · classic");
    assert.equal(card?.serial, "#1/1");
    assert.equal(card?.tokenId, "0xabc");
    assert.equal(draftFromSorare({ sport: "FOOTBALL", pictureUrl: "https://evil.example/a.png" }, "https://sorare.com/x"), null);
  });
});

describe("sanitizeText", () => {
  it("drops tags and control characters", () => {
    assert.equal(sanitizeText("  AJ\u0000 <script>alert(1)</script> Dunk  ", 80), "AJ alert(1) Dunk");
    assert.equal(sanitizeText("&amp; #2", 20), "& #2");
  });
});

describe("manual entry", () => {
  it("keeps a typed card and rejects a mismatched or Pokémon link", () => {
    const typed = manualDigitalDraft({
      platform: "nfl_all_day",
      category: "football",
      title: "  Marquise <b>Brown</b> Reception  ",
      setName: "Inside the Pylons (Series 2)",
      serial: "#12/7000",
      sourceUrl: "https://nflallday.com/listing/moment/1390",
    });
    assert.equal(typed.ok, true);
    if (typed.ok) {
      assert.equal(typed.draft.title, "Marquise Brown Reception");
      assert.equal(typed.draft.collection, "NFL ALL DAY");
      assert.equal(typed.draft.tokenId, "1390");
      assert.equal(typed.draft.sourceUrl, "https://nflallday.com/edition/1390");
    }

    const mismatch = manualDigitalDraft({
      platform: "sorare",
      category: "football",
      title: "Anselmo MacNulty",
      setName: "2025-26",
      serial: "",
      sourceUrl: "https://nbatopshot.com/moment/53013733",
    });
    assert.equal(mismatch.ok, false);
    if (!mismatch.ok) assert.match(mismatch.message, /doesn't match/);

    const pokemon = manualDigitalDraft({
      platform: "nba_top_shot",
      category: "basketball",
      title: "Pokémon Dunk",
      setName: "Series 1",
      serial: "",
      sourceUrl: "",
    });
    assert.equal(pokemon.ok, false);
  });
});

describe("trade copy", () => {
  it("tells friends that TradingCrew does not move a digital card", () => {
    assert.match(digitalTradeNote(), /doesn't take payment/);
    assert.match(acceptedSwapLead("Sam", true), /doesn't take payment/);
    assert.match(acceptedSwapLead("Sam", false), /real cards/);
    assert.equal(acceptedSwapButton(true), "We finished the swap");
    assert.equal(acceptedSwapButton(false), "We swapped cards in person");
  });
});
