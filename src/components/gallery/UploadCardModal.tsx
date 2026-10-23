"use client";

import { useState, useRef, useEffect } from "react";
import { uploadCard, CardCategory } from "@/app/actions/cards";

interface UploadCardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UploadCardModal({ isOpen, onClose }: UploadCardModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async (formData: FormData) => {
    setIsUploading(true);
    setError(null);

    const result = await uploadCard(formData);

    if (result.success) {
      formRef.current?.reset();
      setPreview(null);
      onClose();
    } else {
      setError(result.error || "Failed to upload card");
    }

    setIsUploading(false);
  };

  if (!isOpen) return null;

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
        aria-labelledby="upload-modal-title"
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

        <h2
          id="upload-modal-title"
          className="text-2xl font-bold text-white mb-6"
        >
          Upload New Card
        </h2>

        <form ref={formRef} action={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="file"
              className="block text-sm font-medium text-white/80 mb-2"
            >
              Card Photo
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/20 rounded-2xl p-6 text-center cursor-pointer hover:border-[#F5C542]/50 transition-colors bg-white/5"
            >
              {preview ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-48 mx-auto rounded-lg"
                />
              ) : (
                <div className="py-8">
                  <div className="text-4xl mb-2">📸</div>
                  <p className="text-white/70 text-sm">Click to select a photo</p>
                  <p className="text-white/40 text-xs mt-1">
                    JPEG, PNG, GIF, or WebP (max 10MB)
                  </p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              id="file"
              name="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileChange}
              className="hidden"
              required
            />
          </div>

          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-white/80 mb-2"
            >
              Card Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              placeholder="e.g., Charizard Holo 1st Edition"
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:border-[#F5C542]/50 focus:outline-none focus:ring-1 focus:ring-[#F5C542]/50 transition-colors"
              required
            />
          </div>

          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-white/80 mb-2"
            >
              Category
            </label>
            <select
              id="category"
              name="category"
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:border-[#F5C542]/50 focus:outline-none focus:ring-1 focus:ring-[#F5C542]/50 transition-colors"
            >
              <option value="" className="bg-[#1a1f35]">
                Select category...
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

          <button
            type="submit"
            disabled={isUploading}
            className="w-full px-6 py-4 bg-gradient-to-r from-[#F96D3B] to-[#F5C542] text-white font-bold rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {isUploading ? "Uploading..." : "Upload Card"}
          </button>
        </form>
      </div>
    </div>
  );
}
