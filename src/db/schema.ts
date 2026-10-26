import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  primaryKey,
  integer,
  pgEnum,
  index,
  uniqueIndex,
  check,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const userStatusEnum = pgEnum("user_status", ["pending", "approved", "denied"]);

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  role: userRoleEnum("role").default("user").notNull(),
  status: userStatusEnum("status").default("pending").notNull(),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ]
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => [
    primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  ]
);

export const cardCategoryEnum = pgEnum("card_category", [
  "pokemon",
  "basketball",
  "baseball",
  "football",
]);

export const cards = pgTable(
  "card",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    ownerId: text("ownerId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    category: cardCategoryEnum("category"),
    imageUrl: text("imageUrl").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    // Set while the card is in an accepted trade. Cleared on cancel or completion.
    lockedTradeId: text("lockedTradeId").references((): AnyPgColumn => trades.id, {
      onDelete: "set null",
    }),
  },
  (table) => [index("card_locked_trade_idx").on(table.lockedTradeId)]
);

// One-way gallery grant: owner shares their gallery with grantee.
// The reverse direction is a separate row, created only if the owner asks for it.
export const galleryShares = pgTable(
  "gallery_share",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    ownerId: text("ownerId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    granteeId: text("granteeId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("gallery_share_pair_idx").on(table.ownerId, table.granteeId),
    index("gallery_share_grantee_idx").on(table.granteeId),
    check("gallery_share_no_self", sql`${table.ownerId} <> ${table.granteeId}`),
  ]
);

export const tradeStatusEnum = pgEnum("trade_status", [
  "proposed",
  "accepted",
  "completed",
  "rejected",
  "withdrawn",
  "cancelled",
]);

// offer = proposer gives this card. request = proposer wants this card.
export const tradeItemDirectionEnum = pgEnum("trade_item_direction", ["offer", "request"]);

export const trades = pgTable(
  "trade",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    proposerId: text("proposerId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipientId: text("recipientId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: tradeStatusEnum("status").default("proposed").notNull(),
    message: varchar("message", { length: 280 }),
    statusReason: text("statusReason"),
    // Reserved for a future counter-offer / amend flow. Unused for now.
    parentTradeId: text("parentTradeId").references((): AnyPgColumn => trades.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
    respondedAt: timestamp("respondedAt", { mode: "date" }),
    proposerCompletedAt: timestamp("proposerCompletedAt", { mode: "date" }),
    recipientCompletedAt: timestamp("recipientCompletedAt", { mode: "date" }),
    completedAt: timestamp("completedAt", { mode: "date" }),
    closedAt: timestamp("closedAt", { mode: "date" }),
  },
  (table) => [
    index("trade_recipient_status_idx").on(table.recipientId, table.status),
    index("trade_proposer_status_idx").on(table.proposerId, table.status),
    check("trade_distinct_parties", sql`${table.proposerId} <> ${table.recipientId}`),
  ]
);

export const tradeItems = pgTable(
  "trade_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tradeId: text("tradeId")
      .notNull()
      .references(() => trades.id, { onDelete: "cascade" }),
    // Nulled only when a card in a finished trade is deleted, so history can keep the snapshot.
    cardId: text("cardId").references(() => cards.id, { onDelete: "restrict" }),
    direction: tradeItemDirectionEnum("direction").notNull(),
    title: text("title").notNull(),
    imageUrl: text("imageUrl").notNull(),
    category: cardCategoryEnum("category"),
  },
  (table) => [
    index("trade_item_trade_idx").on(table.tradeId),
    index("trade_item_card_idx").on(table.cardId),
    uniqueIndex("trade_item_trade_card_idx").on(table.tradeId, table.cardId),
  ]
);

export const usersRelations = relations(users, ({ many }) => ({
  cards: many(cards),
  sharesGranted: many(galleryShares, { relationName: "shareOwner" }),
  sharesReceived: many(galleryShares, { relationName: "shareGrantee" }),
  tradesProposed: many(trades, { relationName: "tradeProposer" }),
  tradesReceived: many(trades, { relationName: "tradeRecipient" }),
}));

export const cardsRelations = relations(cards, ({ one, many }) => ({
  owner: one(users, { fields: [cards.ownerId], references: [users.id] }),
  lockedTrade: one(trades, {
    fields: [cards.lockedTradeId],
    references: [trades.id],
    relationName: "lockedCards",
  }),
  tradeItems: many(tradeItems),
}));

export const gallerySharesRelations = relations(galleryShares, ({ one }) => ({
  owner: one(users, {
    fields: [galleryShares.ownerId],
    references: [users.id],
    relationName: "shareOwner",
  }),
  grantee: one(users, {
    fields: [galleryShares.granteeId],
    references: [users.id],
    relationName: "shareGrantee",
  }),
}));

export const tradesRelations = relations(trades, ({ one, many }) => ({
  proposer: one(users, {
    fields: [trades.proposerId],
    references: [users.id],
    relationName: "tradeProposer",
  }),
  recipient: one(users, {
    fields: [trades.recipientId],
    references: [users.id],
    relationName: "tradeRecipient",
  }),
  parent: one(trades, {
    fields: [trades.parentTradeId],
    references: [trades.id],
    relationName: "tradeParent",
  }),
  amendments: many(trades, { relationName: "tradeParent" }),
  items: many(tradeItems),
  lockedCards: many(cards, { relationName: "lockedCards" }),
}));

export const tradeItemsRelations = relations(tradeItems, ({ one }) => ({
  trade: one(trades, { fields: [tradeItems.tradeId], references: [trades.id] }),
  card: one(cards, { fields: [tradeItems.cardId], references: [cards.id] }),
}));

export type User = typeof users.$inferSelect;
export type Card = typeof cards.$inferSelect;
export type NewCard = typeof cards.$inferInsert;
export type GalleryShare = typeof galleryShares.$inferSelect;
export type Trade = typeof trades.$inferSelect;
export type TradeItem = typeof tradeItems.$inferSelect;
export type TradeStatus = Trade["status"];
export type TradeItemDirection = TradeItem["direction"];
