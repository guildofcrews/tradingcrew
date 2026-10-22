"use client";

import { useState, useRef } from "react";
import { uploadCard } from "@/app/actions/cards";

export function UploadCardForm() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    } else {
      setError(result.error || "Failed to upload card");
    }

    setIsUploading(false);
  };

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="bg-white rounded-3xl p-6 border-2 border-[#2B3A67]/10"
    >
      <h2 className="text-xl font-bold text-[#2B3A67] mb-4">Upload New Card</h2>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label
            htmlFor="file"
            className="block text-sm font-medium text-[#2B3A67] mb-2"
          >
            Card Photo
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#2B3A67]/20 rounded-2xl p-6 text-center cursor-pointer hover:border-[#F96D3B]/50 transition-colors"
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
                <p className="text-[#2B3A67]/70 text-sm">
                  Click to select a photo
                </p>
                <p className="text-[#2B3A67]/50 text-xs mt-1">
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

        <div className="space-y-4">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-[#2B3A67] mb-2"
            >
              Card Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              placeholder="e.g., Charizard Holo 1st Edition"
              className="w-full px-4 py-3 rounded-xl border-2 border-[#2B3A67]/10 focus:border-[#F96D3B]/50 focus:outline-none transition-colors"
              required
            />
          </div>

          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-[#2B3A67] mb-2"
            >
              Category (optional)
            </label>
            <select
              id="category"
              name="category"
              className="w-full px-4 py-3 rounded-xl border-2 border-[#2B3A67]/10 focus:border-[#F96D3B]/50 focus:outline-none transition-colors bg-white"
            >
              <option value="">Select category...</option>
              <option value="sports">Sports</option>
              <option value="pokemon">Pokémon</option>
              <option value="other">Other</option>
            </select>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isUploading}
            className="w-full px-6 py-3 bg-[#F96D3B] text-white font-bold rounded-full hover:bg-[#e85a2a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? "Uploading..." : "Upload Card"}
          </button>
        </div>
      </div>
    </form>
  );
}
