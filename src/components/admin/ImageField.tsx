'use client';

import React, { useRef, useState } from 'react';
import { adminUploadImage, adminDeleteImage, isStoredUploadUrl } from '../../lib/api';
import { Label } from './adminFields';
import { Upload, Link2, X, Loader2 } from 'lucide-react';

interface ImageFieldProps {
  value: string;
  onChange: (url: string) => void;
  /**
   * The image the record had when the editor opened. It is kept until the
   * record is saved, because abandoning the form must leave the saved stone
   * exactly as it was — the server removes it on save instead.
   */
  originalValue?: string;
}

/**
 * Stone photograph: upload a file, or paste a URL.
 *
 * Both paths end at the same thing — a string in the gemstone's `image` column
 * — so stones already pointing at an external host keep working untouched, and
 * the desk can mix the two freely.
 *
 * The upload happens immediately on selection rather than on form submit, so
 * the preview shown here is the real stored image rather than a local blob that
 * might never reach the server.
 */
export const ImageField: React.FC<ImageFieldProps> = ({ value, onChange, originalValue }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Discards an image this editor uploaded a moment ago.
   *
   * Only ever called for an upload made during this edit — never for the one
   * the record arrived with, which stays until the save succeeds. Failing to
   * delete is not surfaced: the stone already points elsewhere, and the sweep
   * on the uploads endpoint collects anything left behind.
   */
  const discardIfTransient = async (url: string) => {
    if (!url || url === originalValue || !isStoredUploadUrl(url)) return;
    try {
      await adminDeleteImage(url);
    } catch {
      // Swept later.
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const previous = value;

    try {
      const uploaded = await adminUploadImage(file);
      onChange(uploaded.url);
      // The one it replaced is now unreachable from this form.
      await discardIfTransient(previous);
    } catch (err: any) {
      setError(err?.message ?? 'The image could not be uploaded.');
    } finally {
      setIsUploading(false);
      // Clear the input so re-picking the same file fires change again.
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <Label>Photograph</Label>

      <div className="flex flex-col sm:flex-row gap-3">
        {/* Preview. A broken or unreachable URL collapses to the placeholder
            rather than showing the browser's broken-image glyph. */}
        <div className="w-full sm:w-36 h-36 shrink-0 rounded-lg border border-[#E0D8CE] dark:border-[#332F2B] bg-[#F2ECE4] dark:bg-[#1D1B18] overflow-hidden flex items-center justify-center">
          {value ? (
            <img
              src={value}
              alt="Stone preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <span className="text-xs text-[#A8A29E] dark:text-[#6E6760] font-light px-2 text-center">
              No image yet
            </span>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="hidden"
          />

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
              className="px-4 py-2 rounded text-xs uppercase tracking-wider font-bold border border-[#D5CDC4] dark:border-[#38332E] text-[#57534E] dark:text-[#D5CDC4] hover:border-[#1A1918] dark:hover:border-[#C5A880] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" /> Upload Image
                </>
              )}
            </button>

            {value && (
              <button
                type="button"
                onClick={() => {
                  const previous = value;
                  onChange('');
                  setError(null);
                  void discardIfTransient(previous);
                }}
                disabled={isUploading}
                className="px-3 py-2 rounded text-xs uppercase tracking-wider font-bold border border-[#E9C9C4] dark:border-[#4A2622] text-[#A3524A] dark:text-[#E0897F] hover:bg-[#FDF3F2] dark:hover:bg-[#2A1614] transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" /> Remove
              </button>
            )}
          </div>

          <div className="relative">
            <Link2 className="w-3.5 h-3.5 text-[#8C827A] dark:text-[#6E6760] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="…or paste an image URL"
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#FAF8F5] dark:bg-[#121110] border border-[#E0D8CE] dark:border-[#332F2B] text-sm text-[#1A1918] dark:text-[#F5F2ED] placeholder:text-[#A8A29E] dark:placeholder:text-[#6E6760] focus:outline-none focus:border-[#C5A880] transition-colors"
            />
          </div>

          {error ? (
            <p role="alert" className="text-xs font-semibold text-[#A3524A] dark:text-[#E0897F]">
              {error}
            </p>
          ) : (
            <p className="text-xs text-[#8C827A] dark:text-[#6E6760] font-light">
              JPEG, PNG, WebP or AVIF, up to 8 MB.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
