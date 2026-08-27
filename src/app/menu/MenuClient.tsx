"use client";

import { useState, useRef, useMemo } from "react";
import Modal from "@/components/Modal";
import { formatTSH } from "@/lib/money";
import {
  Image as ImageIcon,
  Upload,
  Camera,
  Trash2,
  Search,
  Check,
  AlertCircle,
  Link as LinkIcon,
  RefreshCw,
  Plus,
  Filter,
} from "lucide-react";

interface Category {
  id: number;
  name: string;
  sort_order: number;
}

interface MenuItem {
  id: number;
  name: string;
  price_tsh: number;
  category_id: number;
  category_name: string;
  active: number;
  deleted: number;
  image_url: string | null;
  track_stock: number;
  stock_qty: number;
}

/**
 * Client-side helper to compress oversized images before uploading
 */
async function compressImageFile(file: File): Promise<File> {
  // If not an image or SVG/GIF, return as is
  if (!file.type.startsWith("image/") || file.type.includes("svg") || file.type.includes("gif")) {
    return file;
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1200;
        let { width, height } = img;
        if (width <= maxDim && height <= maxDim && file.size < 800 * 1024) {
          // Already reasonable size
          resolve(file);
          return;
        }
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), {
                type: "image/webp",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          "image/webp",
          0.85
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export default function MenuClient({
  initialCategories,
  initialItems,
}: {
  initialCategories: Category[];
  initialItems: MenuItem[];
}) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [items, setItems] = useState<MenuItem[]>(initialItems);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>("all");
  const [photoFilter, setPhotoFilter] = useState<"all" | "missing" | "with_photo">("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");

  // Inline table upload tracking (item ID => loading boolean)
  const [inlineUploadingId, setInlineUploadingId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Category form state
  const [showCatModal, setShowCatModal] = useState(false);
  const [catName, setCatName] = useState("");
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState("");

  // Item form state
  const [showItemModal, setShowItemModal] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemCategory, setItemCategory] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemActive, setItemActive] = useState(true);
  const [itemTrackStock, setItemTrackStock] = useState(false);
  const [itemStockQty, setItemStockQty] = useState("");
  const [itemImageUrl, setItemImageUrl] = useState<string | null>(null);
  const [imageInputMode, setImageInputMode] = useState<"upload" | "url">("upload");
  const [externalUrlInput, setExternalUrlInput] = useState("");
  const [itemUploading, setItemUploading] = useState(false);
  const [itemLoading, setItemLoading] = useState(false);
  const [itemError, setItemError] = useState("");

  const inlineFileInputRef = useRef<HTMLInputElement | null>(null);
  const targetInlineItemId = useRef<number | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered Items computation
  const missingPhotoCount = useMemo(() => items.filter((i) => !i.image_url).length, [items]);
  const withPhotoCount = useMemo(() => items.filter((i) => !!i.image_url).length, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesCat = item.category_name.toLowerCase().includes(q);
        if (!matchesName && !matchesCat) return false;
      }
      if (selectedCatFilter !== "all" && item.category_id.toString() !== selectedCatFilter) {
        return false;
      }
      if (photoFilter === "missing" && item.image_url) {
        return false;
      }
      if (photoFilter === "with_photo" && !item.image_url) {
        return false;
      }
      if (activeFilter === "active" && item.active !== 1) {
        return false;
      }
      if (activeFilter === "inactive" && item.active === 1) {
        return false;
      }
      return true;
    });
  }, [items, searchQuery, selectedCatFilter, photoFilter, activeFilter]);

  async function handleCreateCategory() {
    setCatError("");
    setCatLoading(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: catName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCatError(data.error || "Failed");
        return;
      }
      setCategories((prev) => [...prev, data.category]);
      setCatName("");
      setShowCatModal(false);
      showToast("success", `Category "${data.category.name}" created`);
    } catch {
      setCatError("Network error");
    } finally {
      setCatLoading(false);
    }
  }

  function openCreateItem() {
    setEditItem(null);
    setItemName("");
    setItemCategory(categories[0]?.id.toString() || "");
    setItemPrice("");
    setItemActive(true);
    setItemTrackStock(false);
    setItemStockQty("");
    setItemImageUrl(null);
    setExternalUrlInput("");
    setImageInputMode("upload");
    setItemError("");
    setShowItemModal(true);
  }

  function openEditItem(item: MenuItem) {
    setEditItem(item);
    setItemName(item.name);
    setItemCategory(item.category_id.toString());
    setItemPrice(item.price_tsh.toString());
    setItemActive(item.active === 1);
    setItemTrackStock(item.track_stock === 1);
    setItemStockQty(item.stock_qty?.toString() || "0");
    setItemImageUrl(item.image_url);
    setExternalUrlInput(item.image_url?.startsWith("http") ? item.image_url : "");
    setImageInputMode(item.image_url?.startsWith("http") ? "url" : "upload");
    setItemError("");
    setShowItemModal(true);
  }

  async function handleModalImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const rawFile = e.target.files?.[0];
    e.target.value = "";
    if (!rawFile) return;
    setItemError("");
    setItemUploading(true);
    try {
      const fileToUpload = await compressImageFile(rawFile);
      const formData = new FormData();
      formData.append("file", fileToUpload);
      const res = await fetch("/api/menu-items/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setItemError(data.error || "Upload failed");
        return;
      }
      setItemImageUrl(data.url);
      setExternalUrlInput("");
    } catch {
      setItemError("Network error during upload");
    } finally {
      setItemUploading(false);
    }
  }

  function handleApplyExternalUrl() {
    if (!externalUrlInput.trim()) {
      setItemImageUrl(null);
      return;
    }
    const clean = externalUrlInput.trim();
    if (!clean.startsWith("http://") && !clean.startsWith("https://") && !clean.startsWith("/")) {
      setItemError("URL must start with https:// or http:// or /");
      return;
    }
    setItemImageUrl(clean);
    setItemError("");
  }

  async function handleInlineUploadTrigger(itemId: number) {
    targetInlineItemId.current = itemId;
    if (inlineFileInputRef.current) {
      inlineFileInputRef.current.click();
    }
  }

  async function handleInlineFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const rawFile = e.target.files?.[0];
    e.target.value = "";
    const itemId = targetInlineItemId.current;
    if (!rawFile || !itemId) return;

    setInlineUploadingId(itemId);
    try {
      const fileToUpload = await compressImageFile(rawFile);
      const formData = new FormData();
      formData.append("file", fileToUpload);
      const uploadRes = await fetch("/api/menu-items/upload", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        showToast("error", uploadData.error || "Image upload failed");
        return;
      }

      // Immediately patch menu item with permanent image_url
      const patchRes = await fetch(`/api/menu-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: uploadData.url }),
      });
      const patchData = await patchRes.json();
      if (!patchRes.ok) {
        showToast("error", patchData.error || "Failed to link image");
        return;
      }

      setItems((prev) => prev.map((i) => (i.id === itemId ? { ...dataOrSelf(patchData.item, i) } : i)));
      showToast("success", "Photo uploaded and saved permanently!");
    } catch {
      showToast("error", "Network error during inline upload");
    } finally {
      setInlineUploadingId(null);
      targetInlineItemId.current = null;
    }
  }

  function dataOrSelf(updated: MenuItem | undefined, fallback: MenuItem): MenuItem {
    return updated ? { ...fallback, ...updated } : fallback;
  }

  async function handleInlineRemovePhoto(item: MenuItem) {
    if (!confirm(`Remove photo for "${item.name}"?`)) return;
    setInlineUploadingId(item.id);
    try {
      const res = await fetch(`/api/menu-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: null }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast("error", data.error || "Failed to remove image");
        return;
      }
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...dataOrSelf(data.item, i), image_url: null } : i)));
      showToast("success", `Photo removed from "${item.name}"`);
    } catch {
      showToast("error", "Network error");
    } finally {
      setInlineUploadingId(null);
    }
  }

  async function handleSaveItem() {
    setItemError("");
    if (!itemName.trim()) {
      setItemError("Item name is required");
      return;
    }
    const price = parseInt(itemPrice, 10);
    if (isNaN(price) || price < 0) {
      setItemError("Price must be a non-negative number");
      return;
    }
    if (!itemCategory) {
      setItemError("Category is required");
      return;
    }
    const stockQty = parseInt(itemStockQty, 10) || 0;
    if (itemTrackStock && (isNaN(stockQty) || stockQty < 0)) {
      setItemError("Stock quantity must be a non-negative number");
      return;
    }

    setItemLoading(true);
    try {
      const payload = {
        name: itemName.trim(),
        price_tsh: price,
        category_id: parseInt(itemCategory),
        active: itemActive,
        track_stock: itemTrackStock,
        stock_qty: stockQty,
        image_url: itemImageUrl,
      };
      let res, data;
      if (editItem) {
        res = await fetch(`/api/menu-items/${editItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/menu-items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      data = await res.json();
      if (!res.ok) {
        setItemError(data.error || "Failed");
        return;
      }

      if (editItem) {
        setItems((prev) => prev.map((i) => (i.id === editItem.id ? { ...data.item } : i)));
        showToast("success", `"${data.item.name}" updated successfully!`);
      } else {
        setItems((prev) => [...prev, data.item]);
        showToast("success", `"${data.item.name}" added to menu!`);
      }
      setShowItemModal(false);
    } catch {
      setItemError("Network error");
    } finally {
      setItemLoading(false);
    }
  }

  async function handleToggleItem(item: MenuItem) {
    const res = await fetch(`/api/menu-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: item.active === 0 }),
    });
    if (res.ok) {
      const data = await res.json();
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...data.item } : i)));
      showToast("success", `${item.name} is now ${item.active ? "Inactive" : "Active"}`);
    }
  }

  async function handleDeleteItem(item: MenuItem) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    const res = await fetch(`/api/menu-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deleted: true }),
    });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      showToast("success", `"${item.name}" deleted`);
    }
  }

  return (
    <div data-testid="menu-manager" className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Hidden input for 1-click table inline photo uploads */}
      <input
        ref={inlineFileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleInlineFileSelected}
        className="hidden"
      />

      {/* Floating feedback toast */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border text-sm font-medium transition-all animate-in fade-in slide-in-from-top-2 ${
            toastMessage.type === "success"
              ? "bg-emerald-950/90 text-emerald-200 border-emerald-800"
              : "bg-rose-950/90 text-rose-200 border-rose-800"
          }`}
        >
          {toastMessage.type === "success" ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-50 tracking-tight">Menu & Product Management</h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage categories, menu prices, stock levels, and upload permanent product photos.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            data-testid="item-create-button"
            onClick={openCreateItem}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg px-4 py-2 transition-colors text-sm shadow-xs"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Add Menu Item
          </button>
        </div>
      </div>

      {/* Categories Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-100">Categories</h2>
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700 font-mono">
              {categories.length}
            </span>
          </div>
          <button
            data-testid="category-create-button"
            onClick={() => {
              setCatName("");
              setCatError("");
              setShowCatModal(true);
            }}
            className="text-amber-400 hover:text-amber-300 hover:bg-slate-800 border border-slate-700/80 rounded-lg px-3 py-1.5 transition-colors text-xs font-semibold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            New Category
          </button>
        </div>
        <div data-testid="category-list" className="flex flex-wrap gap-2">
          {categories.length === 0 && <span className="text-slate-400 text-sm">No categories yet</span>}
          {categories.map((cat) => (
            <span
              key={cat.id}
              className="bg-slate-800/90 border border-slate-700 text-slate-200 text-sm px-3 py-1.5 rounded-lg flex items-center gap-2"
            >
              <span>{cat.name}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Menu Items Table Card with Enhanced Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xs">
        {/* Filter Controls Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search menu items by name or category..."
                className="w-full bg-slate-800/90 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Photo Status Tabs */}
            <div className="flex items-center flex-wrap gap-1.5 bg-slate-950/50 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setPhotoFilter("all")}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  photoFilter === "all"
                    ? "bg-amber-500 text-slate-950 font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                All Products ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setPhotoFilter("missing")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                  photoFilter === "missing"
                    ? "bg-rose-500 text-white font-semibold"
                    : "text-rose-400 hover:bg-rose-500/10"
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                Missing Photo ({missingPhotoCount})
              </button>
              <button
                type="button"
                onClick={() => setPhotoFilter("with_photo")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                  photoFilter === "with_photo"
                    ? "bg-emerald-500 text-slate-950 font-semibold"
                    : "text-emerald-400 hover:bg-emerald-500/10"
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Has Photo ({withPhotoCount})
              </button>
            </div>
          </div>

          {/* Secondary Category & Active State Filters */}
          <div className="flex flex-wrap items-center gap-3 text-xs pt-1 border-t border-slate-800/60">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-400 font-medium">Category:</span>
              <select
                value={selectedCatFilter}
                onChange={(e) => setSelectedCatFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1 text-slate-200 outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id.toString()}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Status:</span>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1 text-slate-200 outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>
            </div>

            <div className="ml-auto text-slate-400">
              Showing <span className="text-slate-200 font-semibold">{filteredItems.length}</span> of {items.length}{" "}
              items
            </div>
          </div>
        </div>

        {/* Table View */}
        <div data-testid="menu-items-table" className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/30">
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wide text-slate-400 font-semibold">
                  Photo & Product Name
                </th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wide text-slate-400 font-semibold">
                  Category
                </th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wide text-slate-400 font-semibold">
                  Price
                </th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wide text-slate-400 font-semibold">
                  Stock
                </th>
                <th className="text-center px-5 py-3 text-xs uppercase tracking-wide text-slate-400 font-semibold">
                  Status
                </th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wide text-slate-400 font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <ImageIcon className="w-8 h-8 text-slate-600" />
                      <p className="font-medium text-slate-300">No items match your filter criteria.</p>
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedCatFilter("all");
                          setPhotoFilter("all");
                          setActiveFilter("all");
                        }}
                        className="text-xs text-amber-400 hover:underline"
                      >
                        Reset all filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {filteredItems.map((item) => {
                const isUploadingThis = inlineUploadingId === item.id;

                return (
                  <tr key={item.id} className="hover:bg-slate-800/50 transition-colors group">
                    {/* Photo & Item Name Column */}
                    <td className="px-5 py-3.5 text-slate-100 font-medium">
                      <div className="flex items-center gap-3">
                        {/* Interactive Photo Thumbnail */}
                        <div className="relative group/thumb flex-shrink-0">
                          {isUploadingThis ? (
                            <div className="w-12 h-12 rounded-lg bg-slate-800 border border-amber-500/50 flex flex-col items-center justify-center">
                              <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                            </div>
                          ) : item.image_url ? (
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-700 bg-slate-800">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Fallback gracefully on broken images
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                              {/* Quick Hover Controls on existing photo */}
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleInlineUploadTrigger(item.id)}
                                  title="Replace Photo"
                                  className="p-1 rounded bg-slate-800 text-amber-400 hover:bg-slate-700 transition-colors"
                                >
                                  <Camera className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleInlineRemovePhoto(item)}
                                  title="Remove Photo"
                                  className="p-1 rounded bg-slate-800 text-rose-400 hover:bg-slate-700 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Missing Photo State -> Prominent 1-click Upload Trigger */
                            <button
                              type="button"
                              onClick={() => handleInlineUploadTrigger(item.id)}
                              title="Click to quickly upload photo"
                              className="w-12 h-12 rounded-lg bg-rose-500/10 border border-dashed border-rose-500/40 hover:border-amber-400 hover:bg-amber-500/10 flex flex-col items-center justify-center text-rose-400 hover:text-amber-400 transition-all cursor-pointer"
                            >
                              <Camera className="w-4 h-4 mb-0.5" />
                              <span className="text-[9px] font-bold uppercase tracking-tight">+ Upload</span>
                            </button>
                          )}
                        </div>

                        {/* Name and badge */}
                        <div>
                          <div className="font-semibold text-slate-100 flex items-center gap-2">
                            <span>{item.name}</span>
                            {!item.image_url && (
                              <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.2 rounded font-normal">
                                No image
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400">ID #{item.id}</span>
                        </div>
                      </div>
                    </td>

                    {/* Category Column */}
                    <td className="px-5 py-3.5 text-slate-400">{item.category_name}</td>

                    {/* Price Column */}
                    <td className="px-5 py-3.5 text-right font-medium text-amber-400 tabular-nums">
                      {formatTSH(item.price_tsh)}
                    </td>

                    {/* Stock Column */}
                    <td className="px-5 py-3.5 text-right tabular-nums">
                      {item.track_stock ? (
                        <span
                          className={`font-semibold ${
                            item.stock_qty === 0
                              ? "text-rose-400"
                              : item.stock_qty <= 5
                              ? "text-amber-400"
                              : "text-slate-300"
                          }`}
                        >
                          {item.stock_qty} in stock
                        </span>
                      ) : (
                        <span className="text-slate-500">Unlimited (∞)</span>
                      )}
                    </td>

                    {/* Status Column */}
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          item.active ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-400"
                        }`}
                      >
                        {item.active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {/* Actions Column */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          data-testid={`item-edit-${item.id}`}
                          onClick={() => openEditItem(item)}
                          className="text-slate-300 hover:text-amber-400 text-xs px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          data-testid={`item-toggle-${item.id}`}
                          onClick={() => handleToggleItem(item)}
                          className="text-slate-300 hover:text-sky-400 text-xs px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-colors"
                        >
                          {item.active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          data-testid={`item-delete-${item.id}`}
                          onClick={() => handleDeleteItem(item)}
                          className="text-rose-400 hover:text-rose-300 text-xs px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Modal */}
      {showCatModal && (
        <Modal title="Add Category" onClose={() => setShowCatModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Category Name</label>
              <input
                data-testid="category-name"
                type="text"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                placeholder="e.g. Rice & Mains"
                autoFocus
              />
            </div>
            {catError && <div className="text-rose-400 text-sm">{catError}</div>}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowCatModal(false)}
                className="flex-1 bg-slate-800 text-slate-100 border border-slate-700 rounded-lg py-2 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                data-testid="category-save"
                onClick={handleCreateCategory}
                disabled={catLoading}
                className="flex-1 bg-amber-500 text-slate-950 font-semibold rounded-lg py-2 hover:bg-amber-400 disabled:opacity-60 transition-colors"
              >
                {catLoading ? "Saving..." : "Save Category"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Item Modal with Complete Image Management (File Upload & URL Link) */}
      {showItemModal && (
        <Modal title={editItem ? `Edit: ${editItem.name}` : "Add New Menu Item"} onClose={() => setShowItemModal(false)}>
          <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
            <div>
              <label className="block text-sm text-slate-300 mb-1 font-medium">Item Name</label>
              <input
                data-testid="item-name"
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                placeholder="e.g. Biryani Kuku"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-300 mb-1 font-medium">Category</label>
                <select
                  data-testid="item-category"
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1 font-medium">Price (TSH)</label>
                <input
                  data-testid="item-price"
                  type="number"
                  min="0"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  placeholder="e.g. 8500"
                />
              </div>
            </div>

            {/* Product Photo Box */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-200 font-semibold flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                  Product Photo
                </label>
                {itemImageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setItemImageUrl(null);
                      setExternalUrlInput("");
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remove Photo
                  </button>
                )}
              </div>

              {/* Photo Preview & Options */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                {itemImageUrl ? (
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-700 bg-slate-800 flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={itemImageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={() => {
                        setItemError("Failed to load image from provided source.");
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-slate-800/80 border border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 flex-shrink-0">
                    <Camera className="w-6 h-6 mb-1 text-slate-600" />
                    <span className="text-[10px]">No image set</span>
                  </div>
                )}

                <div className="flex-1 w-full space-y-2">
                  {/* Mode switcher */}
                  <div className="flex rounded-lg bg-slate-800 p-0.5 text-xs font-medium border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setImageInputMode("upload")}
                      className={`flex-1 py-1 rounded-md flex items-center justify-center gap-1 transition-colors ${
                        imageInputMode === "upload"
                          ? "bg-amber-500 text-slate-950 font-semibold"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputMode("url")}
                      className={`flex-1 py-1 rounded-md flex items-center justify-center gap-1 transition-colors ${
                        imageInputMode === "url"
                          ? "bg-amber-500 text-slate-950 font-semibold"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      Image URL
                    </button>
                  </div>

                  {imageInputMode === "upload" ? (
                    <label className="block w-full cursor-pointer bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg py-2 px-3 text-xs text-center font-medium transition-colors">
                      {itemUploading ? (
                        <span className="flex items-center justify-center gap-1.5 text-amber-400">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading & optimizing...
                        </span>
                      ) : itemImageUrl ? (
                        "Choose Different File"
                      ) : (
                        "Choose Food Photo (JPEG, PNG, WebP)"
                      )}
                      <input
                        data-testid="item-image"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleModalImageUpload}
                        disabled={itemUploading}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={externalUrlInput}
                        onChange={(e) => setExternalUrlInput(e.target.value)}
                        placeholder="https://images.unsplash.com/... or /api/uploads/..."
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        onClick={handleApplyExternalUrl}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors"
                      >
                        Set
                      </button>
                    </div>
                  )}
                  <p className="text-[11px] text-slate-400">
                    Photos are permanently attached to this product and displayed across the digital menu and POS.
                  </p>
                </div>
              </div>
            </div>

            {/* Visibility & Stock Toggles */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-3">
                <input
                  data-testid="item-active"
                  type="checkbox"
                  id="item-active"
                  checked={itemActive}
                  onChange={(e) => setItemActive(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded"
                />
                <label htmlFor="item-active" className="text-sm text-slate-300 cursor-pointer">
                  Active (visible on customer menu & POS)
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  data-testid="item-track-stock"
                  type="checkbox"
                  id="item-track-stock"
                  checked={itemTrackStock}
                  onChange={(e) => setItemTrackStock(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded"
                />
                <label htmlFor="item-track-stock" className="text-sm text-slate-300 cursor-pointer">
                  Track stock quantity for this item
                </label>
              </div>

              {itemTrackStock && (
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Stock Quantity</label>
                  <input
                    data-testid="item-stock-qty"
                    type="number"
                    min="0"
                    value={itemStockQty}
                    onChange={(e) => setItemStockQty(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                    placeholder="e.g. 25"
                  />
                </div>
              )}
            </div>

            {itemError && (
              <div
                data-testid="item-error"
                className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{itemError}</span>
              </div>
            )}

            <div className="flex gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowItemModal(false)}
                className="flex-1 bg-slate-800 text-slate-100 border border-slate-700 rounded-lg py-2.5 text-sm font-medium hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                data-testid="item-save"
                type="button"
                onClick={handleSaveItem}
                disabled={itemLoading || itemUploading}
                className="flex-1 bg-amber-500 text-slate-950 font-semibold rounded-lg py-2.5 text-sm hover:bg-amber-400 disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5"
              >
                {itemLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : editItem ? (
                  "Update Item & Save Photo"
                ) : (
                  "Add Item"
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
