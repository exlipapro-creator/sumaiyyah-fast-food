"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { formatTSH } from "@/lib/money";

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
  const [itemLoading, setItemLoading] = useState(false);
  const [itemError, setItemError] = useState("");

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
      if (!res.ok) { setCatError(data.error || "Failed"); return; }
      setCategories(prev => [...prev, data.category]);
      setCatName("");
      setShowCatModal(false);
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
    setItemError("");
    setShowItemModal(true);
  }

  function openEditItem(item: MenuItem) {
    setEditItem(item);
    setItemName(item.name);
    setItemCategory(item.category_id.toString());
    setItemPrice(item.price_tsh.toString());
    setItemActive(item.active === 1);
    setItemError("");
    setShowItemModal(true);
  }

  async function handleSaveItem() {
    setItemError("");
    if (!itemName.trim()) { setItemError("Item name is required"); return; }
    const price = parseInt(itemPrice, 10);
    if (isNaN(price) || price < 0) { setItemError("Price must be a non-negative number"); return; }
    if (!itemCategory) { setItemError("Category is required"); return; }

    setItemLoading(true);
    try {
      let res, data;
      if (editItem) {
        res = await fetch(`/api/menu-items/${editItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: itemName.trim(), price_tsh: price, category_id: parseInt(itemCategory), active: itemActive }),
        });
      } else {
        res = await fetch("/api/menu-items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: itemName.trim(), price_tsh: price, category_id: parseInt(itemCategory), active: itemActive }),
        });
      }
      data = await res.json();
      if (!res.ok) { setItemError(data.error || "Failed"); return; }

      if (editItem) {
        setItems(prev => prev.map(i => i.id === editItem.id ? { ...data.item } : i));
      } else {
        setItems(prev => [...prev, data.item]);
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
      setItems(prev => prev.map(i => i.id === item.id ? { ...data.item } : i));
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
      setItems(prev => prev.filter(i => i.id !== item.id));
    }
  }

  return (
    <div data-testid="menu-manager" className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-50">Menu Management</h1>
        <p className="text-slate-400 text-sm mt-1">Manage categories and menu items</p>
      </div>

      {/* Categories */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-100">Categories</h2>
          <button
            data-testid="category-create-button"
            onClick={() => { setCatName(""); setCatError(""); setShowCatModal(true); }}
            className="bg-amber-500 text-slate-950 font-semibold rounded-lg px-4 py-2 hover:bg-amber-400 transition-colors text-sm"
          >
            + Add Category
          </button>
        </div>
        <div data-testid="category-list" className="flex flex-wrap gap-2">
          {categories.length === 0 && (
            <span className="text-slate-400 text-sm">No categories yet</span>
          )}
          {categories.map(cat => (
            <span
              key={cat.id}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-sm px-3 py-1.5 rounded-lg"
            >
              {cat.name}
            </span>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-xl font-semibold text-slate-100">Menu Items</h2>
          <button
            data-testid="item-create-button"
            onClick={openCreateItem}
            className="bg-amber-500 text-slate-950 font-semibold rounded-lg px-4 py-2 hover:bg-amber-400 transition-colors text-sm"
          >
            + Add Item
          </button>
        </div>

        <div data-testid="menu-items-table" className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wide text-slate-400 font-semibold">Name</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wide text-slate-400 font-semibold">Category</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wide text-slate-400 font-semibold">Price</th>
                <th className="text-center px-5 py-3 text-xs uppercase tracking-wide text-slate-400 font-semibold">Status</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wide text-slate-400 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400">No items yet. Click &quot;Add Item&quot; to get started.</td>
                </tr>
              )}
              {items.map(item => (
                <tr key={item.id} className="hover:bg-slate-800/60 transition-colors">
                  <td className="px-5 py-3 text-slate-100 font-medium">{item.name}</td>
                  <td className="px-5 py-3 text-slate-400">{item.category_name}</td>
                  <td className="px-5 py-3 text-right text-amber-500 tabular-nums">{formatTSH(item.price_tsh)}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                      item.active ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-400"
                    }`}>
                      {item.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        data-testid={`item-edit-${item.id}`}
                        onClick={() => openEditItem(item)}
                        className="text-slate-400 hover:text-amber-400 text-xs px-2 py-1 rounded hover:bg-slate-800 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        data-testid={`item-toggle-${item.id}`}
                        onClick={() => handleToggleItem(item)}
                        className="text-slate-400 hover:text-sky-400 text-xs px-2 py-1 rounded hover:bg-slate-800 transition-colors"
                      >
                        {item.active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        data-testid={`item-delete-${item.id}`}
                        onClick={() => handleDeleteItem(item)}
                        className="text-slate-400 hover:text-rose-400 text-xs px-2 py-1 rounded hover:bg-slate-800 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
                onChange={e => setCatName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                placeholder="e.g. Burgers"
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

      {/* Item Modal */}
      {showItemModal && (
        <Modal title={editItem ? "Edit Item" : "Add Menu Item"} onClose={() => setShowItemModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Item Name</label>
              <input
                data-testid="item-name"
                type="text"
                value={itemName}
                onChange={e => setItemName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                placeholder="e.g. Classic Burger"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Category</label>
              <select
                data-testid="item-category"
                value={itemCategory}
                onChange={e => setItemCategory(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Price (TSH)</label>
              <input
                data-testid="item-price"
                type="number"
                min="0"
                value={itemPrice}
                onChange={e => setItemPrice(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                placeholder="e.g. 8500"
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                data-testid="item-active"
                type="checkbox"
                id="item-active"
                checked={itemActive}
                onChange={e => setItemActive(e.target.checked)}
                className="w-4 h-4 accent-amber-500"
              />
              <label htmlFor="item-active" className="text-sm text-slate-300">Active (visible on POS)</label>
            </div>
            {itemError && (
              <div data-testid="item-error" className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                {itemError}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowItemModal(false)}
                className="flex-1 bg-slate-800 text-slate-100 border border-slate-700 rounded-lg py-2 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                data-testid="item-save"
                onClick={handleSaveItem}
                disabled={itemLoading}
                className="flex-1 bg-amber-500 text-slate-950 font-semibold rounded-lg py-2 hover:bg-amber-400 disabled:opacity-60 transition-colors"
              >
                {itemLoading ? "Saving..." : editItem ? "Update Item" : "Add Item"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
