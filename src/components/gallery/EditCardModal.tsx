"use client";

import { useState, useEffect } from "react";
import { updateCard, deleteCard, CardCategory } from "@/app/actions/cards";
import type { Card as DbCard } from "@/db/schema";
import type { Card } from "@/lib/cards";
import { getImageUrl } from "@/lib/images";

interface EditCardModalProps {
  card: (Card | DbCard) | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EditCardModal({ card, isOpen, onClose }: EditCardModalProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<CardCategory | "">("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setCategory(card.category || "");
    }
  }, [card]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setShowDeleteConfirm(false);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!card) return;

    setIsUpdating(true);
    setError(null);

    const result = await updateCard(card.id, {
      title: title.trim(),
      category: category || null,
    });

    if (result.success) {
      onClose();
    } else {
      setError(result.error || "Failed to update card");
    }

    setIsUpdating(false);
  };

  const handleDelete = async () => {
    if (!card) return;

    setIsDeleting(true);
    setError(null);

    const result = await deleteCard(card.id);

    if (result.success) {
      onClose();
    } else {
      setError(result.error || "Failed to delete card");
      setIsDeleting(false);
    }
  };

  if (!isOpen || !card) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="relative bg-[#1a1f35] rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl border border-white/10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-modal-title"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <h2 id="edit-modal-title" className="text-2xl font-bold text-white mb-6">
          Edit Card
        </h2>

        <div className="mb-6">
          <div className="relative aspect-[3/4] max-w-[200px] mx-auto rounded-xl overflow-hidden">
            <img
              src={getImageUrl(card.imageUrl)}
              alt={card.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        </div>

        {showDeleteConfirm ? (
          <div className="space-y-4">
            <p className="text-center text-white/80">
              Are you sure you want to delete this card? This action cannot be
              undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUpdate} className="space-y-6">
            <div>
              <label
                htmlFor="edit-title"
                className="block text-sm font-medium text-white/80 mb-2"
              >
                Card Title
              </label>
              <input
                type="text"
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:border-[#F5C542]/50 focus:outline-none focus:ring-1 focus:ring-[#F5C542]/50 transition-colors"
                required
              />
            </div>

            <div>
              <label
                htmlFor="edit-category"
                className="block text-sm font-medium text-white/80 mb-2"
              >
                Category
              </label>
              <select
                id="edit-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as CardCategory | "")}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:border-[#F5C542]/50 focus:outline-none focus:ring-1 focus:ring-[#F5C542]/50 transition-colors"
              >
                <option value="" className="bg-[#1a1f35]">
                  Uncategorized
                </option>
                <option value="pokemon" className="bg-[#1a1f35]">
                  Pokémon
                </option>
                <option value="basketball" className="bg-[#1a1f35]">
                  Basketball
                </option>
                <option value="baseball" className="bg-[#1a1f35]">
                  Baseball
                </option>
                <option value="football" className="bg-[#1a1f35]">
                  Football
                </option>
              </select>
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-3 bg-red-500/20 text-red-400 font-medium rounded-xl hover:bg-red-500/30 transition-colors"
              >
                Delete
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-[#F96D3B] to-[#F5C542] text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {isUpdating ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
