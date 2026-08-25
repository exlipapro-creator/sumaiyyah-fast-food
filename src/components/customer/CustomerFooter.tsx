import React from "react";
import Link from "next/link";
import {
  CookingPot,
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  Sparkles,
  MessageSquare,
  Truck,
  CreditCard,
  Smartphone,
  CheckCircle2,
} from "lucide-react";

export default function CustomerFooter() {
  return (
    <footer className="bg-[#0F172A] border-t border-slate-800 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          
          {/* Brand Col */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0062C3] via-[#004B93] to-[#E5002B] p-0.5 shadow-md">
                <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                  <CookingPot className="w-5 h-5 text-[#E5002B]" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-tight text-white uppercase leading-none font-serif">
                  SUMAIYYAH
                </span>
                <span className="text-[10px] tracking-[0.25em] text-[#E5002B] font-black uppercase mt-0.5">
                  FAST FOOD
                </span>
              </div>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              Serving Dar es Salaam&apos;s most flavorful smash burgers, crispy chicken, seasoned fries, and authentic Swahili fast food with speed and high standards.
            </p>
            <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 rounded-xl w-fit font-medium">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>100% Halal Certified Kitchen</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h3 className="text-white font-bold text-xs uppercase tracking-wider">Quick Navigation</h3>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <Link href="/order" className="hover:text-amber-400 transition-colors">
                  Explore Menu & Order
                </Link>
              </li>
              <li>
                <Link href="/deals" className="hover:text-amber-400 transition-colors flex items-center gap-1.5">
                  <span>Deals & Family Combos</span>
                  <span className="text-[9px] bg-[#E5002B] text-white px-1.5 py-0.5 rounded font-black">SAVE</span>
                </Link>
              </li>
              <li>
                <Link href="/track-order" className="hover:text-amber-400 transition-colors">
                  Live Order Tracker
                </Link>
              </li>
              <li>
                <Link href="/favorites" className="hover:text-amber-400 transition-colors">
                  Saved Favorites
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-slate-400 hover:text-white transition-colors">
                  Staff & Kitchen Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Store Hours & Delivery */}
          <div className="space-y-3">
            <h3 className="text-white font-bold text-xs uppercase tracking-wider">Service Hours & Delivery</h3>
            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-[#0078D7] mt-0.5 shrink-0" />
                <div>
                  <div className="text-slate-200 font-semibold">Open 7 Days a Week</div>
                  <div className="text-slate-400 text-xs">8:00 AM – 11:00 PM (Daily)</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5 pt-1">
                <Truck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-slate-200 font-semibold">City-Wide Express Dispatch</div>
                  <div className="text-slate-400 text-xs">Fast delivery across Kariakoo, CBD, Kinondoni, Sinza & beyond</div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact & Location */}
          <div className="space-y-3">
            <h3 className="text-white font-bold text-xs uppercase tracking-wider">Location & Orders</h3>
            <div className="space-y-2.5 text-xs sm:text-sm">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#E5002B] mt-0.5 shrink-0" />
                <span>Kariakoo, Dar es Salaam, Tanzania</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <a href="tel:+255700000000" className="hover:text-white transition-colors font-mono">
                  +255 700 000 000
                </a>
              </div>
              <div className="pt-2">
                <a
                  href="https://wa.me/255700000000"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>WhatsApp Kitchen Order</span>
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom copyright & attribution */}
        <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            &copy; {new Date().getFullYear()} Sumaiyyah Fast Food. All rights reserved.
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>M-Pesa / Tigo Pesa / Airtel</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-blue-400" />
              <span>Cash & Cards Accepted</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

