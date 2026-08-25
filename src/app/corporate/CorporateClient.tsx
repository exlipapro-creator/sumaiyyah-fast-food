"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Calendar,
  Clock,
  Users,
  UtensilsCrossed,
  MapPin,
  FileText,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Repeat,
  Bookmark,
  ChevronRight,
  Package,
  Info,
  Loader2,
  Truck,
} from "lucide-react";

interface CorporatePackage {
  id: number;
  name: string;
  tagline: string;
  description: string;
  price_tsh: number;
  minimum_quantity: number;
  serves_people_min: number;
  lead_time_hours: number;
  badge?: string;
  image_url?: string;
  items: Array<{
    menu_item_id: number;
    name: string;
    quantity: number;
    price_tsh: number;
  }>;
}

interface MenuItem {
  id: number;
  name: string;
  price_tsh: number;
  description?: string;
  category_name?: string;
  image_url?: string;
  in_stock: boolean;
  options?: any;
  dietary_tags?: string[];
}

interface DeliveryWindow {
  id: string;
  label: string;
  start_time: string;
  end_time: string;
  category: string;
  cutoff_minutes_prior: number;
}

interface CorporateAccount {
  id: number;
  company_name: string;
  legal_name: string;
  account_code: string;
  billing_email: string;
  billing_phone: string;
  payment_terms: string;
  credit_limit_tsh: number;
}

interface CorporateLocation {
  id: number;
  label: string;
  area: string;
  building_name: string;
  address: string;
  floor: string;
  office_number: string;
  delivery_instructions: string;
}

interface CorporateContact {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  is_primary: number;
}

interface OrderTemplate {
  id: number;
  name: string;
  default_location_id: number | null;
  default_attendee_count: number;
  items: Array<{
    menu_item_id: number | null;
    package_id: number | null;
    name_snapshot: string;
    quantity: number;
  }>;
}

export default function CorporateClient() {
  const router = useRouter();

  // Data Loading
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<CorporatePackage[]>([]);
  const [individualItems, setIndividualItems] = useState<MenuItem[]>([]);
  const [deliveryWindows, setDeliveryWindows] = useState<DeliveryWindow[]>([]);

  // Mode: "guest_bulk" | "corporate_account"
  const [orderMode, setOrderMode] = useState<"guest_bulk" | "corporate_account">("guest_bulk");

  // Corporate Account State
  const [accountCodeInput, setAccountCodeInput] = useState("");
  const [accountSearching, setAccountSearching] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [activeAccount, setActiveAccount] = useState<CorporateAccount | null>(null);
  const [savedLocations, setSavedLocations] = useState<CorporateLocation[]>([]);
  const [savedContacts, setSavedContacts] = useState<CorporateContact[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<OrderTemplate[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);

  // Guest Details
  const [guestCompanyName, setGuestCompanyName] = useState("");
  const [guestContactName, setGuestContactName] = useState("");
  const [guestContactPhone, setGuestContactPhone] = useState("");
  const [guestContactEmail, setGuestContactEmail] = useState("");
  const [guestArea, setGuestArea] = useState("CBD / Posta");
  const [guestBuilding, setGuestBuilding] = useState("");
  const [guestFloor, setGuestFloor] = useState("");
  const [guestInstructions, setGuestInstructions] = useState("");

  // Schedule & Context
  const getTodayString = () => new Date().toISOString().split("T")[0];
  const [deliveryDate, setDeliveryDate] = useState(getTodayString());
  const [deliveryWindow, setDeliveryWindow] = useState("lunch-2"); // Default 12:00 - 12:30
  const [serviceContext, setServiceContext] = useState<string>("office_lunch");
  const [attendeeCount, setAttendeeCount] = useState<number>(15);

  // Cart / Selections
  // Key: `pkg-${id}` or `item-${id}`
  const [packageQuantities, setPackageQuantities] = useState<Record<number, number>>({});
  const [itemQuantities, setItemQuantities] = useState<Record<number, number>>({});
  const [activeCategoryTab, setActiveCategoryTab] = useState<"packages" | "individual">("packages");

  // Invoicing & Payment
  const [poReference, setPoReference] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("mobile");
  const [invoiceRequired, setInvoiceRequired] = useState(false);
  const [specialNotes, setSpecialNotes] = useState("");
  const [saveAsTemplateName, setSaveAsTemplateName] = useState("");
  const [wantSaveTemplate, setWantSaveTemplate] = useState(false);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderConfirmation, setOrderConfirmation] = useState<any | null>(null);

  // Fetch initial corporate data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch("/api/public/corporate/packages");
        if (res.ok) {
          const data = await res.json();
          setPackages(data.packages || []);
          setIndividualItems(data.individual_items || []);
          setDeliveryWindows(data.delivery_windows || []);
          // Pre-populate with first recommended package for standard office lunch
          if (data.packages?.length > 0) {
            setPackageQuantities({ [data.packages[0].id]: 10 });
          }
        }
      } catch (err) {
        console.error("Error loading corporate menu:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Handle Corporate Account Lookup
  const handleAccountLookup = async (codeToSearch?: string) => {
    const code = (codeToSearch || accountCodeInput).trim().toUpperCase();
    if (!code) {
      setAccountError("Please enter your company account code.");
      return;
    }

    setAccountSearching(true);
    setAccountError(null);

    try {
      const res = await fetch(`/api/public/corporate/accounts?code=${encodeURIComponent(code)}`);
      const data = await res.json();

      if (!res.ok) {
        setAccountError(data.error || "Account not found. Verify code or order as guest.");
        setActiveAccount(null);
      } else {
        setActiveAccount(data.account);
        setSavedLocations(data.locations || []);
        setSavedContacts(data.contacts || []);
        setSavedTemplates(data.templates || []);

        if (data.locations?.length > 0) {
          setSelectedLocationId(data.locations[0].id);
        }
        if (data.contacts?.length > 0) {
          setSelectedContactId(data.contacts[0].id);
        }

        // Default to invoice if account has Net terms
        if (data.account.payment_terms !== "DUE_ON_DELIVERY") {
          setPaymentMethod("invoice");
          setInvoiceRequired(true);
        }
      }
    } catch (err) {
      setAccountError("Connection error during account lookup.");
    } finally {
      setAccountSearching(false);
    }
  };

  // Quick preset account buttons for demonstration
  const handleQuickSelectPreset = (code: string) => {
    setAccountCodeInput(code);
    setOrderMode("corporate_account");
    handleAccountLookup(code);
  };

  // Load a Saved Template
  const handleApplyTemplate = async (template: OrderTemplate) => {
    try {
      const templateItems = template.items.map((ti) => ({
        menu_item_id: ti.menu_item_id,
        package_id: ti.package_id,
        name: ti.name_snapshot,
        quantity: ti.quantity,
      }));

      const res = await fetch("/api/public/corporate/repeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: templateItems }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const newPkgQty: Record<number, number> = {};
        const newItemQty: Record<number, number> = {};

        for (const it of data.items) {
          if (it.type === "package" && it.package_id) {
            newPkgQty[it.package_id] = it.quantity;
          } else if (it.menu_item_id) {
            newItemQty[it.menu_item_id] = it.quantity;
          }
        }

        setPackageQuantities(newPkgQty);
        setItemQuantities(newItemQty);
        if (template.default_attendee_count) {
          setAttendeeCount(template.default_attendee_count);
        }
        if (template.default_location_id) {
          setSelectedLocationId(template.default_location_id);
        }
      }
    } catch (err) {
      console.error("Error applying template:", err);
    }
  };

  // Calculations
  const packageTotal = useMemo(() => {
    return packages.reduce((sum, pkg) => {
      const qty = packageQuantities[pkg.id] || 0;
      return sum + pkg.price_tsh * qty;
    }, 0);
  }, [packages, packageQuantities]);

  const itemsTotal = useMemo(() => {
    return individualItems.reduce((sum, item) => {
      const qty = itemQuantities[item.id] || 0;
      return sum + item.price_tsh * qty;
    }, 0);
  }, [individualItems, itemQuantities]);

  const subtotal = packageTotal + itemsTotal;
  const deliveryFee = 2500;
  const grandTotal = subtotal > 0 ? subtotal + deliveryFee : 0;

  // Total items/portions count
  const totalPortionsCount = useMemo(() => {
    let count = 0;
    for (const [pkgIdStr, qty] of Object.entries(packageQuantities)) {
      const pkg = packages.find((p) => p.id === Number(pkgIdStr));
      if (pkg && qty > 0) {
        count += (pkg.serves_people_min || 1) * qty;
      }
    }
    for (const [, qty] of Object.entries(itemQuantities)) {
      count += qty;
    }
    return count;
  }, [packageQuantities, itemQuantities, packages]);

  // Target dispatch estimation
  const selectedWindowObj = deliveryWindows.find((w) => w.id === deliveryWindow);
  const targetDispatchTime = useMemo(() => {
    if (!selectedWindowObj) return "11:30";
    const [h, m] = selectedWindowObj.start_time.split(":").map(Number);
    const totalMin = h * 60 + m - 25;
    const dh = Math.max(7, Math.floor(totalMin / 60));
    const dm = Math.max(0, totalMin % 60);
    return `${String(dh).padStart(2, "0")}:${String(dm).padStart(2, "0")}`;
  }, [selectedWindowObj]);

  // Handle Submit Order
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Build payload items
    const itemsPayload: any[] = [];
    for (const [pkgIdStr, qty] of Object.entries(packageQuantities)) {
      const pkgId = Number(pkgIdStr);
      if (qty > 0) {
        const pkg = packages.find((p) => p.id === pkgId);
        itemsPayload.push({
          package_id: pkgId,
          name: pkg?.name,
          quantity: qty,
        });
      }
    }

    for (const [itemIdStr, qty] of Object.entries(itemQuantities)) {
      const itemId = Number(itemIdStr);
      if (qty > 0) {
        const item = individualItems.find((i) => i.id === itemId);
        itemsPayload.push({
          menu_item_id: itemId,
          name: item?.name,
          quantity: qty,
        });
      }
    }

    if (itemsPayload.length === 0) {
      setSubmitError("Please select at least one corporate package or menu item.");
      return;
    }

    if (orderMode === "corporate_account" && !activeAccount) {
      setSubmitError("Please verify your Corporate Account code before proceeding.");
      return;
    }

    if (orderMode === "guest_bulk") {
      if (!guestCompanyName.trim()) {
        setSubmitError("Please enter your Company / Organization name.");
        return;
      }
      if (!guestContactName.trim()) {
        setSubmitError("Please enter the contact person's name.");
        return;
      }
      if (!guestContactPhone.trim()) {
        setSubmitError("Please enter a direct phone number for delivery coordination.");
        return;
      }
      if (!guestBuilding.trim()) {
        setSubmitError("Please enter your office building or tower name.");
        return;
      }
    }

    setSubmitting(true);

    try {
      const payload: any = {
        order_mode: orderMode,
        corporate_account_id: orderMode === "corporate_account" ? activeAccount?.id : undefined,
        corporate_location_id: orderMode === "corporate_account" ? selectedLocationId : undefined,
        corporate_contact_id: orderMode === "corporate_account" ? selectedContactId : undefined,
        guest_company_name: guestCompanyName,
        guest_contact_name: guestContactName,
        guest_contact_phone: guestContactPhone,
        guest_contact_email: guestContactEmail,
        area: guestArea,
        building: guestBuilding,
        floor: guestFloor,
        delivery_instructions: guestInstructions,
        delivery_date: deliveryDate,
        delivery_window: deliveryWindow,
        service_context: serviceContext,
        attendee_count: attendeeCount,
        po_reference_number: poReference,
        payment_method: paymentMethod,
        invoice_required: invoiceRequired,
        special_notes: specialNotes,
        items: itemsPayload,
      };

      const res = await fetch("/api/public/corporate/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || "Failed to submit corporate order. Please review your selections.");
      } else {
        // If user wanted to save template
        if (wantSaveTemplate && saveAsTemplateName.trim() && activeAccount) {
          fetch("/api/public/corporate/templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              corporate_account_id: activeAccount.id,
              name: saveAsTemplateName.trim(),
              default_location_id: selectedLocationId,
              default_attendee_count: attendeeCount,
              created_by_name: guestContactName || activeAccount.company_name,
              items: itemsPayload,
            }),
          }).catch(console.error);
        }

        setOrderConfirmation(data);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      setSubmitError("Network or server error submitting corporate order.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-[#0062C3] mb-3" />
        <p className="text-sm font-semibold">Loading Corporate Catering Engine...</p>
      </div>
    );
  }

  // Submission Success View
  if (orderConfirmation) {
    return (
      <div className="max-w-3xl mx-auto py-8 animate-in fade-in-50 duration-300">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <span className="inline-block px-3 py-1 bg-blue-50 text-[#0062C3] rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            Corporate Scheduled Order Submitted
          </span>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Order #{orderConfirmation.receipt_no} Received
          </h1>

          <p className="mt-2 text-slate-600 text-sm max-w-lg mx-auto">
            Your group order for <strong className="text-slate-800">{orderConfirmation.company_name}</strong> has been logged in our kitchen management queue.
          </p>

          {/* Key Scheduled Information Card */}
          <div className="mt-6 bg-[#F7FAFD] rounded-xl border border-slate-200/80 p-5 text-left grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-xs text-slate-500 font-medium block">Scheduled Delivery</span>
              <strong className="text-slate-800 font-bold block mt-0.5">
                {orderConfirmation.scheduled_date}
              </strong>
              <span className="text-xs text-slate-600 font-medium">{orderConfirmation.delivery_window}</span>
            </div>

            <div>
              <span className="text-xs text-slate-500 font-medium block">Kitchen Dispatch Target</span>
              <strong className="text-[#0062C3] font-bold block mt-0.5">
                {orderConfirmation.target_dispatch_at} EAT
              </strong>
              <span className="text-xs text-slate-500">Staging 25m prior</span>
            </div>

            <div>
              <span className="text-xs text-slate-500 font-medium block">Fulfillment Total</span>
              <strong className="text-slate-900 font-bold block mt-0.5 font-mono">
                TZS {orderConfirmation.total_tsh?.toLocaleString()}
              </strong>
              <span className="text-xs text-emerald-600 font-semibold">
                {orderConfirmation.invoice_number ? `Invoiced (${orderConfirmation.invoice_number})` : "Direct Billing"}
              </span>
            </div>
          </div>

          {/* Action Links */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={orderConfirmation.tracking_url || `/track-order?receipt=${orderConfirmation.receipt_no}`}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#0062C3] hover:bg-[#004B93] text-white text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <Truck className="w-4 h-4" />
              <span>Track Delivery Schedule</span>
            </Link>

            <button
              onClick={() => {
                setOrderConfirmation(null);
                setPackageQuantities({});
                setItemQuantities({});
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition-colors"
            >
              Place Another Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Q1. Minimal Context Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0062C3]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#0062C3]">
              Sumaiyyah Corporate & Office Catering
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Scheduled Office Lunches & Boardroom Platters
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Fresh char-grilled meals, curated individual lunch boxes, and sharing platters for teams, executive meetings, and corporate events across Dar es Salaam.
          </p>
        </div>

        {/* Demo Account Quick Pickers */}
        <div className="shrink-0 bg-[#F7FAFD] border border-slate-200 rounded-xl p-3 text-xs">
          <span className="text-[11px] text-slate-500 font-semibold block mb-1.5">
            Quick Corporate Accounts:
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickSelectPreset("VODA-HQ")}
              className="px-2.5 py-1 bg-white border border-slate-300 hover:border-[#0062C3] hover:text-[#0062C3] rounded-lg font-bold text-slate-700 transition-colors"
            >
              Vodacom HQ
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelectPreset("CRDB-HQ")}
              className="px-2.5 py-1 bg-white border border-slate-300 hover:border-[#0062C3] hover:text-[#0062C3] rounded-lg font-bold text-slate-700 transition-colors"
            >
              CRDB Towers
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelectPreset("SW-TECH")}
              className="px-2.5 py-1 bg-white border border-slate-300 hover:border-[#0062C3] hover:text-[#0062C3] rounded-lg font-bold text-slate-700 transition-colors"
            >
              Swahili Tech
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Columns: Configuration & Menu Builder */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Q2. Ordering Mode & Account Lookup */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#0062C3]" />
                <h2 className="text-base font-bold text-slate-900">Corporate Account & Mode</h2>
              </div>
              <span className="text-xs text-slate-400 font-medium">Step 1 of 4</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                onClick={() => {
                  setOrderMode("guest_bulk");
                  setActiveAccount(null);
                  setPaymentMethod("mobile");
                }}
                className={`py-3 px-4 rounded-xl border text-xs sm:text-sm font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                  orderMode === "guest_bulk"
                    ? "bg-[#EBF4FF] border-[#0062C3] text-[#0062C3] shadow-xs"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>Company Guest / Quick Order</span>
                <span className="text-[11px] font-normal text-slate-500">Pay via Mobile / Bank / Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setOrderMode("corporate_account")}
                className={`py-3 px-4 rounded-xl border text-xs sm:text-sm font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                  orderMode === "corporate_account"
                    ? "bg-[#EBF4FF] border-[#0062C3] text-[#0062C3] shadow-xs"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>Registered Corporate Account</span>
                <span className="text-[11px] font-normal text-slate-500">Saved Locations & Net Invoicing</span>
              </button>
            </div>

            {orderMode === "corporate_account" && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                {!activeAccount ? (
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-700">
                      Enter Corporate Account Code (e.g. VODA-HQ, CRDB-HQ, SW-TECH)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={accountCodeInput}
                        onChange={(e) => setAccountCodeInput(e.target.value.toUpperCase())}
                        placeholder="e.g. VODA-HQ"
                        className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono uppercase font-bold focus:bg-white focus:border-[#0062C3] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleAccountLookup()}
                        disabled={accountSearching}
                        className="px-5 py-2.5 bg-[#0062C3] hover:bg-[#004B93] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        {accountSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify Account"}
                      </button>
                    </div>

                    {accountError && (
                      <p className="text-xs font-semibold text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{accountError}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-900">
                            {activeAccount.company_name}
                          </h3>
                          <span className="text-xs text-slate-500">
                            Code: <strong className="font-mono">{activeAccount.account_code}</strong> • Terms:{" "}
                            <strong className="text-emerald-700">{activeAccount.payment_terms}</strong>
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveAccount(null);
                          setSavedLocations([]);
                          setSavedContacts([]);
                          setSavedTemplates([]);
                        }}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline"
                      >
                        Change
                      </button>
                    </div>

                    {/* Saved Location Selector */}
                    {savedLocations.length > 0 && (
                      <div className="pt-2 border-t border-emerald-200/60">
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Delivery Office / Branch Location:
                        </label>
                        <select
                          value={selectedLocationId || ""}
                          onChange={(e) => setSelectedLocationId(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:border-[#0062C3] focus:outline-none"
                        >
                          {savedLocations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.label} — {loc.building_name} ({loc.floor})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Saved Templates Quick Load */}
                    {savedTemplates.length > 0 && (
                      <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-600 font-semibold flex items-center gap-1">
                          <Bookmark className="w-3.5 h-3.5 text-[#0062C3]" />
                          Saved Order Templates:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {savedTemplates.map((tmpl) => (
                            <button
                              key={tmpl.id}
                              type="button"
                              onClick={() => handleApplyTemplate(tmpl)}
                              className="px-2.5 py-1 bg-white border border-emerald-300 hover:border-emerald-500 rounded-md text-[11px] font-bold text-emerald-800 transition-colors"
                            >
                              Load "{tmpl.name}"
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Q3 & Q4. Scheduled Timing, Service Context & Attendee Count */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#0062C3]" />
                <h2 className="text-base font-bold text-slate-900">Schedule & Group Size</h2>
              </div>
              <span className="text-xs text-slate-400 font-medium">Step 2 of 4</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Delivery Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Scheduled Delivery Date
                </label>
                <input
                  type="date"
                  min={getTodayString()}
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:bg-white focus:border-[#0062C3] focus:outline-none"
                />
              </div>

              {/* Delivery Window */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Delivery Time Window
                </label>
                <select
                  value={deliveryWindow}
                  onChange={(e) => setDeliveryWindow(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:bg-white focus:border-[#0062C3] focus:outline-none"
                >
                  {deliveryWindows.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Context */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Catering Event Type
                </label>
                <select
                  value={serviceContext}
                  onChange={(e) => setServiceContext(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:bg-white focus:border-[#0062C3] focus:outline-none"
                >
                  <option value="office_lunch">Office Lunch / Team Meal</option>
                  <option value="meeting_event">Meeting / Workshop Platter</option>
                  <option value="team_celebration">Team Celebration / Event</option>
                  <option value="custom_bulk">Custom Bulk Order</option>
                </select>
              </div>
            </div>

            {/* Q4. Attendee Count Interactive Stepper */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#0062C3]" />
                  <span className="text-xs font-bold text-slate-800">
                    How many attendees / people to serve?
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Live portion suggestions adapt to this headcount.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setAttendeeCount((prev) => Math.max(1, prev - 5))}
                    className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 transition-colors font-bold"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-4 py-1 text-sm font-bold text-slate-800 min-w-12 text-center font-mono">
                    {attendeeCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAttendeeCount((prev) => prev + 5)}
                    className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 transition-colors font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex gap-1">
                  {[10, 20, 50].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAttendeeCount(preset)}
                      className={`px-2 py-1 text-xs rounded-lg font-bold border transition-colors ${
                        attendeeCount === preset
                          ? "bg-[#0062C3] text-white border-[#0062C3]"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Target Dispatch Live Notice */}
            <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 text-xs flex items-center justify-between text-slate-700">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-4 h-4 text-[#0062C3]" />
                <span>
                  Kitchen Staging & Dispatch Target: <strong className="text-[#004B93]">{targetDispatchTime} EAT</strong>
                </span>
              </span>
              <span className="text-[11px] text-slate-500 font-semibold hidden sm:inline">
                Staged hot in insulated catering containers
              </span>
            </div>
          </div>

          {/* Q5. Build the Order: Packages & A La Carte */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-[#0062C3]" />
                <h2 className="text-base font-bold text-slate-900">Build Your Order</h2>
              </div>
              <span className="text-xs text-slate-400 font-medium">Step 3 of 4</span>
            </div>

            {/* Menu Category Switcher */}
            <div className="flex border-b border-slate-200 gap-4 text-xs sm:text-sm font-bold">
              <button
                type="button"
                onClick={() => setActiveCategoryTab("packages")}
                className={`pb-2 border-b-2 transition-colors ${
                  activeCategoryTab === "packages"
                    ? "border-[#0062C3] text-[#0062C3]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Catering Packages & Platters ({packages.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveCategoryTab("individual")}
                className={`pb-2 border-b-2 transition-colors ${
                  activeCategoryTab === "individual"
                    ? "border-[#0062C3] text-[#0062C3]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                A La Carte Burgers & Sides ({individualItems.length})
              </button>
            </div>

            {/* Package Cards Grid */}
            {activeCategoryTab === "packages" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {packages.map((pkg) => {
                  const qty = packageQuantities[pkg.id] || 0;
                  const isRecommended =
                    attendeeCount >= pkg.serves_people_min && attendeeCount <= pkg.serves_people_min * 2;

                  return (
                    <div
                      key={pkg.id}
                      className={`rounded-xl border p-4 flex flex-col justify-between transition-all ${
                        qty > 0
                          ? "border-[#0062C3] bg-[#F7FAFD] shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div>
                            {pkg.badge && (
                              <span className="inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-[#E5002B] text-white rounded-full mb-1">
                                {pkg.badge}
                              </span>
                            )}
                            <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
                              {pkg.name}
                            </h3>
                          </div>
                          <span className="text-xs font-mono font-extrabold text-slate-900 shrink-0">
                            TZS {pkg.price_tsh.toLocaleString()}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 mb-2 leading-relaxed">
                          {pkg.description}
                        </p>

                        <div className="bg-slate-50 rounded-lg p-2 text-[11px] text-slate-600 mb-3 space-y-0.5">
                          <span className="font-bold text-slate-700 block">Includes:</span>
                          <p className="line-clamp-2">{pkg.tagline}</p>
                          <span className="text-[10px] text-slate-400 block pt-1">
                            Min Order: {pkg.minimum_quantity} unit(s) • Serves {pkg.serves_people_min}+ people
                          </span>
                        </div>
                      </div>

                      {/* Quantity Selector */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <span className="text-xs font-semibold text-slate-600">
                          {qty > 0 ? (
                            <strong className="text-[#0062C3]">
                              TZS {(pkg.price_tsh * qty).toLocaleString()}
                            </strong>
                          ) : (
                            "Not added"
                          )}
                        </span>

                        <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white">
                          <button
                            type="button"
                            onClick={() => {
                              const newQty = Math.max(0, qty - 1);
                              setPackageQuantities({ ...packageQuantities, [pkg.id]: newQty });
                            }}
                            className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-bold"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-3 py-1 text-xs font-bold text-slate-800 min-w-8 text-center font-mono">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const newQty = qty === 0 ? pkg.minimum_quantity : qty + 1;
                              setPackageQuantities({ ...packageQuantities, [pkg.id]: newQty });
                            }}
                            className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-bold"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Individual Items Grid */}
            {activeCategoryTab === "individual" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {individualItems.map((item) => {
                  const qty = itemQuantities[item.id] || 0;
                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border p-3 flex flex-col justify-between transition-all ${
                        qty > 0
                          ? "border-[#0062C3] bg-[#F7FAFD]"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <h4 className="text-xs font-bold text-slate-900 leading-snug">
                            {item.name}
                          </h4>
                          <span className="text-xs font-mono font-bold text-slate-900 shrink-0">
                            TZS {item.price_tsh.toLocaleString()}
                          </span>
                        </div>
                        {item.category_name && (
                          <span className="text-[10px] text-slate-400 block mb-1">
                            {item.category_name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                        <span className="text-[11px] font-mono text-slate-500">
                          {qty > 0 ? `TZS ${(item.price_tsh * qty).toLocaleString()}` : "—"}
                        </span>
                        <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white">
                          <button
                            type="button"
                            onClick={() => {
                              const newQty = Math.max(0, qty - 1);
                              setItemQuantities({ ...itemQuantities, [item.id]: newQty });
                            }}
                            className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 font-bold"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="px-2.5 py-0.5 text-xs font-bold text-slate-800 min-w-6 text-center font-mono">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setItemQuantities({ ...itemQuantities, [item.id]: qty + 1 });
                            }}
                            className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 font-bold"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Q6. Delivery Location & Office Details */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#0062C3]" />
                <h2 className="text-base font-bold text-slate-900">Delivery & Office Details</h2>
              </div>
              <span className="text-xs text-slate-400 font-medium">Step 4 of 4</span>
            </div>

            {orderMode === "guest_bulk" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Company / Organization *</label>
                  <input
                    type="text"
                    required
                    value={guestCompanyName}
                    onChange={(e) => setGuestCompanyName(e.target.value)}
                    placeholder="e.g. PwC Tanzania / Stanbic"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:border-[#0062C3] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={guestContactName}
                    onChange={(e) => setGuestContactName(e.target.value)}
                    placeholder="e.g. Salma Mhando"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:border-[#0062C3] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Direct Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={guestContactPhone}
                    onChange={(e) => setGuestContactPhone(e.target.value)}
                    placeholder="e.g. +255 7XX XXX XXX"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:border-[#0062C3] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Business Email (Optional)</label>
                  <input
                    type="email"
                    value={guestContactEmail}
                    onChange={(e) => setGuestContactEmail(e.target.value)}
                    placeholder="e.g. office@company.co.tz"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:border-[#0062C3] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Area / District *</label>
                  <select
                    value={guestArea}
                    onChange={(e) => setGuestArea(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:border-[#0062C3] focus:outline-none"
                  >
                    <option value="CBD / Posta">CBD / Posta (Dar es Salaam City Centre)</option>
                    <option value="Mlimani / Ubungo">Mlimani / Ubungo / Sam Nujoma</option>
                    <option value="Masaki / Oysterbay">Masaki / Oysterbay Peninsula</option>
                    <option value="Mikocheni / Msasani">Mikocheni / Msasani</option>
                    <option value="Sinza / Kijitonyama">Sinza / Kijitonyama</option>
                    <option value="Kariakoo / Ilala">Kariakoo / Ilala</option>
                    <option value="Upanga / Kivukoni">Upanga / Kivukoni</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Building / Tower Name *</label>
                  <input
                    type="text"
                    required
                    value={guestBuilding}
                    onChange={(e) => setGuestBuilding(e.target.value)}
                    placeholder="e.g. Viva Towers / NIC Life House"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:border-[#0062C3] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Floor & Office / Suite Number</label>
                  <input
                    type="text"
                    value={guestFloor}
                    onChange={(e) => setGuestFloor(e.target.value)}
                    placeholder="e.g. 5th Floor, Suite 502"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:border-[#0062C3] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Security & Gate Instructions</label>
                  <input
                    type="text"
                    value={guestInstructions}
                    onChange={(e) => setGuestInstructions(e.target.value)}
                    placeholder="e.g. Park at Gate 1, rider must register at reception"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:border-[#0062C3] focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                {savedLocations.find((l) => l.id === selectedLocationId) ? (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                    <strong className="text-slate-800 block">
                      {savedLocations.find((l) => l.id === selectedLocationId)?.building_name}
                    </strong>
                    <p className="text-slate-600">
                      {savedLocations.find((l) => l.id === selectedLocationId)?.address},{" "}
                      {savedLocations.find((l) => l.id === selectedLocationId)?.area}
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      Floor: {savedLocations.find((l) => l.id === selectedLocationId)?.floor} (
                      {savedLocations.find((l) => l.id === selectedLocationId)?.office_number})
                    </p>
                    {savedLocations.find((l) => l.id === selectedLocationId)?.delivery_instructions && (
                      <p className="text-blue-700 text-[11px] pt-1">
                        Note: {savedLocations.find((l) => l.id === selectedLocationId)?.delivery_instructions}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-500">Select a location above or contact staff.</p>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Additional Gate / Delivery Note</label>
                  <input
                    type="text"
                    value={guestInstructions}
                    onChange={(e) => setGuestInstructions(e.target.value)}
                    placeholder="Optional day-of gate instructions"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:border-[#0062C3] focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right 1 Column: Summary & Checkout Action */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs sticky top-24 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">Corporate Order Summary</h3>
              <span className="text-xs bg-blue-50 text-[#0062C3] font-bold px-2 py-0.5 rounded-md">
                {totalPortionsCount} portions
              </span>
            </div>

            {/* Selected Items Breakdown */}
            <div className="max-h-60 overflow-y-auto space-y-2 text-xs pr-1">
              {Object.entries(packageQuantities).map(([pkgIdStr, qty]) => {
                if (qty <= 0) return null;
                const pkg = packages.find((p) => p.id === Number(pkgIdStr));
                if (!pkg) return null;
                return (
                  <div key={pkgIdStr} className="flex items-center justify-between gap-2 py-1 border-b border-slate-50">
                    <div>
                      <span className="font-bold text-slate-800">{pkg.name}</span>
                      <span className="text-slate-400 block text-[11px]">Qty: {qty} × TZS {pkg.price_tsh.toLocaleString()}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-800">
                      TZS {(pkg.price_tsh * qty).toLocaleString()}
                    </span>
                  </div>
                );
              })}

              {Object.entries(itemQuantities).map(([itemIdStr, qty]) => {
                if (qty <= 0) return null;
                const item = individualItems.find((i) => i.id === Number(itemIdStr));
                if (!item) return null;
                return (
                  <div key={itemIdStr} className="flex items-center justify-between gap-2 py-1 border-b border-slate-50">
                    <div>
                      <span className="font-bold text-slate-800">{item.name}</span>
                      <span className="text-slate-400 block text-[11px]">Qty: {qty} × TZS {item.price_tsh.toLocaleString()}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-800">
                      TZS {(item.price_tsh * qty).toLocaleString()}
                    </span>
                  </div>
                );
              })}

              {subtotal === 0 && (
                <p className="text-slate-400 italic text-center py-4">No packages or items selected yet.</p>
              )}
            </div>

            {/* Invoicing / PO Reference */}
            <div className="pt-3 border-t border-slate-100 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  PO / Cost-Center Reference (Optional)
                </label>
                <input
                  type="text"
                  value={poReference}
                  onChange={(e) => setPoReference(e.target.value)}
                  placeholder="e.g. PO-2026-ENG-08"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:border-[#0062C3] focus:outline-none"
                />
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value);
                    if (e.target.value === "invoice") setInvoiceRequired(true);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:border-[#0062C3] focus:outline-none"
                >
                  <option value="mobile">Mobile Money (M-Pesa / Tigo Pesa)</option>
                  <option value="bank_transfer">Direct Bank Transfer</option>
                  <option value="card">Credit / Debit Card</option>
                  <option value="cash">Cash on Delivery</option>
                  {orderMode === "corporate_account" && (
                    <option value="invoice">
                      Corporate Invoice ({activeAccount?.payment_terms || "NET_30"})
                    </option>
                  )}
                </select>
              </div>

              {/* Save As Recurring Template (for registered corporate accounts) */}
              {activeAccount && (
                <div className="pt-2 border-t border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wantSaveTemplate}
                      onChange={(e) => setWantSaveTemplate(e.target.checked)}
                      className="rounded text-[#0062C3] focus:ring-0"
                    />
                    <span className="font-bold text-slate-700">Save as reusable order template</span>
                  </label>

                  {wantSaveTemplate && (
                    <input
                      type="text"
                      value={saveAsTemplateName}
                      onChange={(e) => setSaveAsTemplateName(e.target.value)}
                      placeholder="Template name e.g. Friday Tech Lunch"
                      className="mt-2 w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Financial Totals */}
            <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Food & Beverages Subtotal</span>
                <span className="font-mono">TZS {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Office Delivery & Staging Fee</span>
                <span className="font-mono">TZS {subtotal > 0 ? deliveryFee.toLocaleString() : "0"}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Amount</span>
                <span className="font-mono text-[#0062C3]">TZS {grandTotal.toLocaleString()}</span>
              </div>
            </div>

            {submitError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || subtotal === 0}
              className="w-full py-3.5 px-4 bg-[#0062C3] hover:bg-[#004B93] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Scheduled Order...</span>
                </>
              ) : (
                <>
                  <span>Submit Corporate Order</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center">
              <p className="text-[11px] text-slate-400">
                Orders are confirmed by our kitchen team within 15 minutes of submission.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
