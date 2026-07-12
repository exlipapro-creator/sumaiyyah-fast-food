"use client";

import { useState } from "react";
import Modal from "@/components/Modal";

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  active: number;
  created_at: string;
}

export default function UsersClient({
  initialUsers,
  currentUserId,
}: {
  initialUsers: User[];
  currentUserId: number;
}) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [showModal, setShowModal] = useState(false);
  const [formEmail, setFormEmail] = useState("");
  const [formName, setFormName] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState("cashier");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  function openCreate() {
    setFormEmail("");
    setFormName("");
    setFormPassword("");
    setFormRole("cashier");
    setFormError("");
    setShowModal(true);
  }

  async function handleCreate() {
    setFormError("");
    if (!formEmail.trim()) { setFormError("Email is required"); return; }
    if (!formName.trim()) { setFormError("Name is required"); return; }
    if (!formPassword) { setFormError("Password is required"); return; }

    setFormLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formEmail.trim(), name: formName.trim(), password: formPassword, role: formRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to create user");
        return;
      }
      setUsers(prev => [...prev, data.user]);
      setShowModal(false);
    } catch {
      setFormError("Network error");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDeactivate(user: User) {
    const action = user.active ? "deactivate" : "reactivate";
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${user.name}?`)) return;
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !user.active }),
    });
    if (res.ok) {
      const data = await res.json();
      setUsers(prev => prev.map(u => u.id === user.id ? { ...data.user } : u));
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-50">User Management</h1>
          <p className="text-slate-400 text-sm mt-1">Manage cashier and manager accounts</p>
        </div>
        <button
          data-testid="user-create-button"
          onClick={openCreate}
          className="bg-amber-500 text-slate-950 font-semibold rounded-lg px-4 py-2 hover:bg-amber-400 transition-colors text-sm"
        >
          + Add User
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl">
        <div data-testid="users-table" className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wide text-slate-400">Name</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wide text-slate-400">Email</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wide text-slate-400">Role</th>
                <th className="text-center px-5 py-3 text-xs uppercase tracking-wide text-slate-400">Status</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wide text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-slate-800/60 transition-colors">
                  <td className="px-5 py-3 text-slate-100 font-medium">{user.name}</td>
                  <td className="px-5 py-3 text-slate-400">{user.email}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                      user.role === "manager"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-slate-700 text-slate-300"
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                      user.active ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-400"
                    }`}>
                      {user.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {user.id !== currentUserId && (
                      <button
                        data-testid={`user-deactivate-${user.id}`}
                        onClick={() => handleDeactivate(user)}
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          user.active
                            ? "text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                            : "text-slate-400 hover:text-emerald-400 hover:bg-slate-800"
                        }`}
                      >
                        {user.active ? "Deactivate" : "Reactivate"}
                      </button>
                    )}
                    {user.id === currentUserId && (
                      <span className="text-slate-600 text-xs">(you)</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <Modal title="Add User" onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Email</label>
              <input
                data-testid="user-email"
                type="email"
                value={formEmail}
                onChange={e => setFormEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="user@example.com"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Full Name</label>
              <input
                data-testid="user-name"
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Password</label>
              <input
                data-testid="user-password"
                type="password"
                value={formPassword}
                onChange={e => setFormPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Role</label>
              <select
                data-testid="user-role"
                value={formRole}
                onChange={e => setFormRole(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value="cashier">Cashier</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            {formError && (
              <div data-testid="user-error" className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                {formError}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-slate-800 text-slate-100 border border-slate-700 rounded-lg py-2 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                data-testid="user-save"
                onClick={handleCreate}
                disabled={formLoading}
                className="flex-1 bg-amber-500 text-slate-950 font-semibold rounded-lg py-2 hover:bg-amber-400 disabled:opacity-60 transition-colors"
              >
                {formLoading ? "Creating..." : "Create User"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
