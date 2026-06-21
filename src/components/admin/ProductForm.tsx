"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { slugify } from "@/lib/utils";

interface Catalog {
  id: string;
  name: string;
  catalogId: string;
}

interface GalleryImage {
  id?: string;
  image: string;
  label: string;
  caption?: string;
  sortOrder: number;
}

interface ProductFormData {
  name: string;
  slug: string;
  catalogId: string;
  category: string;
  series: string;
  collection: string;
  size: string;
  finish: string;
  application: string;
  panelLayout: string;
  spaces: string[];
  hasMatchingFloor: string;
  variants: string;
  image: string;
  imageAlt: string;
  imageRotation: number;
  hasGallery: boolean;
  gallery: GalleryImage[];
  showFirst: string;
  sortOrder: number;
  hidden: boolean;
}

interface ProductFormProps {
  catalogs: Catalog[];
  initialData?: Partial<ProductFormData> & { id?: string };
  mode: "new" | "edit";
}

const SIZES = [
  "300x300mm",
  "300x450mm",
  "300x600mm",
  "400x400mm",
  "600x600mm",
  "600x1200mm",
];
const FINISHES = ["Matt", "Gloss", "Sugar", "Carving", "Rustic", "Polished", "Satin", "High Gloss"];
const APPLICATIONS = ["Wall", "Floor", "Both", "Art Panel"];
const CATEGORIES = [
  "Digital",
  "Marble",
  "Stone",
  "Wood",
  "Concrete",
  "Abstract",
  "Plain",
  "Decorative",
  "Highlighter",
];
const SPACES_LIST = [
  "Living Room",
  "Bedroom",
  "Kitchen",
  "Bathroom",
  "Outdoor",
  "Commercial",
  "Dining Room",
  "Hallway",
];
const GALLERY_LABELS = ["Mockup", "Room Scene", "Detail", "Exterior", "Close-up"];

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  background: "var(--color-bg)",
  border: "1px solid var(--color-border-subtle)",
  borderRadius: "6px",
  color: "var(--color-text)",
  fontSize: "13px",
  outline: "none",
};

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontWeight: 500,
  color: "var(--color-text-muted)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  marginBottom: "6px",
};

const FIELD_STYLE: React.CSSProperties = { marginBottom: "20px" };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={FIELD_STYLE}>
      <label style={LABEL_STYLE}>{label}</label>
      {children}
    </div>
  );
}

export default function ProductForm({ catalogs, initialData, mode }: ProductFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [slugManual, setSlugManual] = useState(!!initialData?.slug);

  const [form, setForm] = useState<ProductFormData>({
    name: initialData?.name ?? "",
    slug: initialData?.slug ?? "",
    catalogId: initialData?.catalogId ?? (catalogs[0]?.id ?? ""),
    category: initialData?.category ?? "",
    series: initialData?.series ?? "",
    collection: initialData?.collection ?? "",
    size: initialData?.size ?? "600x1200mm",
    finish: initialData?.finish ?? "",
    application: initialData?.application ?? "Wall",
    panelLayout: initialData?.panelLayout ?? "",
    spaces: initialData?.spaces ?? [],
    hasMatchingFloor: initialData?.hasMatchingFloor ?? "",
    variants: initialData?.variants ?? "",
    image: initialData?.image ?? "",
    imageAlt: initialData?.imageAlt ?? "",
    imageRotation: initialData?.imageRotation ?? 0,
    hasGallery: initialData?.hasGallery ?? false,
    gallery: initialData?.gallery ?? [],
    showFirst: initialData?.showFirst ?? "product",
    sortOrder: initialData?.sortOrder ?? 100,
    hidden: initialData?.hidden ?? false,
  });

  useEffect(() => {
    if (!slugManual && mode === "new") {
      setForm((f) => ({ ...f, slug: slugify(f.name) }));
    }
  }, [form.name, slugManual, mode]);

  function set<K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleSpace(space: string) {
    setForm((f) => ({
      ...f,
      spaces: f.spaces.includes(space)
        ? f.spaces.filter((s) => s !== space)
        : [...f.spaces, space],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const payload = {
      ...form,
      variants: form.variants
        ? form.variants.split(",").map((v) => v.trim()).filter(Boolean)
        : [],
      panelLayout: form.panelLayout ? JSON.parse(form.panelLayout || "null") : null,
    };

    try {
      const url =
        mode === "edit"
          ? `/api/products/${initialData?.id}`
          : "/api/products";
      const method = mode === "edit" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save product");
      }

      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${initialData?.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (data.url) set("image", data.url);
  }

  const sectionStyle: React.CSSProperties = {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "8px",
    padding: "24px",
    marginBottom: "20px",
  };
  const sectionTitle: React.CSSProperties = {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--color-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginBottom: "20px",
    paddingBottom: "12px",
    borderBottom: "1px solid var(--color-border)",
  };
  const grid2: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div
          style={{
            marginBottom: "20px",
            padding: "12px 16px",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "6px",
            color: "var(--color-danger)",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px", alignItems: "start" }}>
        {/* Left column */}
        <div>
          {/* Identity */}
          <div style={sectionStyle}>
            <div style={sectionTitle}>Identity</div>
            <Field label="Product Name">
              <input
                style={INPUT_STYLE}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Marble White 600x1200"
                required
              />
            </Field>
            <Field label="Slug">
              <input
                style={INPUT_STYLE}
                value={form.slug}
                onChange={(e) => {
                  setSlugManual(true);
                  set("slug", e.target.value);
                }}
                placeholder="auto-generated-from-name"
                required
              />
            </Field>
            <div style={grid2}>
              <Field label="Series">
                <input
                  style={INPUT_STYLE}
                  value={form.series}
                  onChange={(e) => set("series", e.target.value)}
                  placeholder="e.g. Eleganz"
                  required
                />
              </Field>
              <Field label="Collection">
                <input
                  style={INPUT_STYLE}
                  value={form.collection}
                  onChange={(e) => set("collection", e.target.value)}
                  placeholder="optional"
                />
              </Field>
            </div>
          </div>

          {/* Classification */}
          <div style={sectionStyle}>
            <div style={sectionTitle}>Classification</div>
            <div style={grid2}>
              <Field label="Catalog">
                <select
                  style={INPUT_STYLE}
                  value={form.catalogId}
                  onChange={(e) => set("catalogId", e.target.value)}
                  required
                >
                  {catalogs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Category">
                <select
                  style={INPUT_STYLE}
                  value={form.category}
                  onChange={(e) => set("category", e.target.value)}
                  required
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Size">
                <select
                  style={INPUT_STYLE}
                  value={form.size}
                  onChange={(e) => set("size", e.target.value)}
                  required
                >
                  {SIZES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Finish">
                <select
                  style={INPUT_STYLE}
                  value={form.finish}
                  onChange={(e) => set("finish", e.target.value)}
                  required
                >
                  <option value="">Select finish</option>
                  {FINISHES.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </Field>
              <Field label="Application">
                <select
                  style={INPUT_STYLE}
                  value={form.application}
                  onChange={(e) => set("application", e.target.value)}
                >
                  {APPLICATIONS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </Field>
              <Field label="Has Matching Floor">
                <input
                  style={INPUT_STYLE}
                  value={form.hasMatchingFloor}
                  onChange={(e) => set("hasMatchingFloor", e.target.value)}
                  placeholder="product-slug or empty"
                />
              </Field>
            </div>

            {form.application === "Art Panel" && (
              <Field label="Panel Layout (JSON)">
                <textarea
                  style={{ ...INPUT_STYLE, height: "80px", resize: "vertical", fontFamily: "monospace", fontSize: "12px" }}
                  value={form.panelLayout}
                  onChange={(e) => set("panelLayout", e.target.value)}
                  placeholder='{"rows": 2, "cols": 2}'
                />
              </Field>
            )}

            <Field label="Variants (comma-separated slugs)">
              <input
                style={INPUT_STYLE}
                value={form.variants}
                onChange={(e) => set("variants", e.target.value)}
                placeholder="variant-1, variant-2"
              />
            </Field>
          </div>

          {/* Spaces */}
          <div style={sectionStyle}>
            <div style={sectionTitle}>Spaces</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {SPACES_LIST.map((space) => (
                <label
                  key={space}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 12px",
                    background: form.spaces.includes(space)
                      ? "rgba(181, 138, 82, 0.15)"
                      : "var(--color-bg)",
                    border: form.spaces.includes(space)
                      ? "1px solid var(--color-accent)"
                      : "1px solid var(--color-border-subtle)",
                    borderRadius: "5px",
                    cursor: "pointer",
                    fontSize: "12px",
                    color: form.spaces.includes(space)
                      ? "var(--color-accent)"
                      : "var(--color-text-muted)",
                    fontWeight: form.spaces.includes(space) ? 500 : 400,
                  }}
                >
                  <input
                    type="checkbox"
                    style={{ display: "none" }}
                    checked={form.spaces.includes(space)}
                    onChange={() => toggleSpace(space)}
                  />
                  {space}
                </label>
              ))}
            </div>
          </div>

          {/* Gallery */}
          <div style={sectionStyle}>
            <div style={sectionTitle}>Gallery</div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "var(--color-text)" }}>
                <input
                  type="checkbox"
                  checked={form.hasGallery}
                  onChange={(e) => set("hasGallery", e.target.checked)}
                />
                Enable Gallery
              </label>
              {form.hasGallery && (
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Show first:</span>
                  {["product", "mockup"].map((v) => (
                    <label key={v} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", cursor: "pointer" }}>
                      <input type="radio" value={v} checked={form.showFirst === v} onChange={() => set("showFirst", v)} />
                      {v}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {form.hasGallery && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {form.gallery.map((img, i) => (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 120px auto auto",
                      gap: "8px",
                      alignItems: "center",
                      padding: "10px",
                      background: "var(--color-bg)",
                      borderRadius: "6px",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <input
                      style={{ ...INPUT_STYLE, marginBottom: 0 }}
                      value={img.image}
                      onChange={(e) => {
                        const g = [...form.gallery];
                        g[i] = { ...g[i], image: e.target.value };
                        set("gallery", g);
                      }}
                      placeholder="/uploads/image.jpg"
                    />
                    <select
                      style={{ ...INPUT_STYLE, marginBottom: 0 }}
                      value={img.label}
                      onChange={(e) => {
                        const g = [...form.gallery];
                        g[i] = { ...g[i], label: e.target.value };
                        set("gallery", g);
                      }}
                    >
                      {GALLERY_LABELS.map((l) => (
                        <option key={l} value={l.toLowerCase()}>{l}</option>
                      ))}
                    </select>
                    <input
                      style={{ ...INPUT_STYLE, marginBottom: 0, width: "100px" }}
                      type="number"
                      value={img.sortOrder}
                      onChange={(e) => {
                        const g = [...form.gallery];
                        g[i] = { ...g[i], sortOrder: Number(e.target.value) };
                        set("gallery", g);
                      }}
                      placeholder="Order"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const g = form.gallery.filter((_, idx) => idx !== i);
                        set("gallery", g);
                      }}
                      style={{
                        padding: "6px",
                        background: "transparent",
                        border: "1px solid var(--color-border)",
                        borderRadius: "4px",
                        color: "var(--color-danger)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    set("gallery", [
                      ...form.gallery,
                      { image: "", label: "mockup", sortOrder: form.gallery.length * 10 },
                    ])
                  }
                  style={{
                    padding: "8px 14px",
                    background: "transparent",
                    border: "1px dashed var(--color-border-subtle)",
                    borderRadius: "6px",
                    color: "var(--color-text-muted)",
                    fontSize: "12px",
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  + Add image
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div>
          {/* Image */}
          <div style={sectionStyle}>
            <div style={sectionTitle}>Main Image</div>
            <Field label="Image URL or Upload">
              <input
                style={INPUT_STYLE}
                value={form.image}
                onChange={(e) => set("image", e.target.value)}
                placeholder="/uploads/tile.jpg"
              />
            </Field>
            <Field label="Upload File">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ fontSize: "12px", color: "var(--color-text-muted)" }}
              />
            </Field>
            {form.image && (
              <div style={{ marginBottom: "16px" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.image}
                  alt="Preview"
                  style={{ width: "100%", borderRadius: "6px", border: "1px solid var(--color-border)" }}
                />
              </div>
            )}
            <Field label="Alt Text">
              <input
                style={INPUT_STYLE}
                value={form.imageAlt}
                onChange={(e) => set("imageAlt", e.target.value)}
                placeholder="Descriptive alt text"
              />
            </Field>
            <Field label="Rotation">
              <div style={{ display: "flex", gap: "8px" }}>
                {[0, 90, 180, 270].map((deg) => (
                  <label
                    key={deg}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "12px",
                      cursor: "pointer",
                      padding: "5px 10px",
                      borderRadius: "4px",
                      background:
                        form.imageRotation === deg
                          ? "rgba(181,138,82,0.15)"
                          : "var(--color-bg)",
                      border:
                        form.imageRotation === deg
                          ? "1px solid var(--color-accent)"
                          : "1px solid var(--color-border)",
                      color:
                        form.imageRotation === deg
                          ? "var(--color-accent)"
                          : "var(--color-text-muted)",
                    }}
                  >
                    <input
                      type="radio"
                      style={{ display: "none" }}
                      value={deg}
                      checked={form.imageRotation === deg}
                      onChange={() => set("imageRotation", deg)}
                    />
                    {deg}°
                  </label>
                ))}
              </div>
            </Field>
          </div>

          {/* Settings */}
          <div style={sectionStyle}>
            <div style={sectionTitle}>Settings</div>
            <Field label="Sort Order">
              <input
                style={INPUT_STYLE}
                type="number"
                value={form.sortOrder}
                onChange={(e) => set("sortOrder", Number(e.target.value))}
              />
            </Field>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                type="checkbox"
                id="hidden"
                checked={form.hidden}
                onChange={(e) => set("hidden", e.target.checked)}
              />
              <label
                htmlFor="hidden"
                style={{ fontSize: "13px", cursor: "pointer", color: "var(--color-text)" }}
              >
                Hide from product grid
              </label>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "10px 20px",
                background: "var(--color-accent)",
                color: "#0a0a0a",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
              {saving ? "Saving..." : mode === "edit" ? "Save Changes" : "Create Product"}
            </button>

            {mode === "edit" && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  padding: "10px 20px",
                  background: "transparent",
                  color: "var(--color-danger)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: "6px",
                  fontSize: "13px",
                  cursor: deleting ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                {deleting ? "Deleting..." : "Delete Product"}
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </form>
  );
}
