"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Calendar, Car, Phone } from "lucide-react";
import { STATUS_COLORS, STATUS_LABELS, formatDateDisplay } from "@/lib/booking-helpers";

interface SearchResult {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  plate_number: string | null;
  appointment_date: string;
  status: string;
  branch: { name: string; code: string } | null;
  advisor: { name: string } | null;
}

interface CustomerSearchProps {
  onNavigate: (date: string, branchId?: string) => void;
}

export function CustomerSearch({ onNavigate }: CustomerSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data);
      setOpen(true);
      setLoading(false);
    }, 300);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (r: SearchResult) => {
    onNavigate(r.appointment_date, r.branch?.id);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative w-full max-w-sm">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, phone or plate..."
          className="w-full pl-9 pr-8"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {open && (
        <div className="absolute top-full z-50 mt-1 w-full min-w-[340px] rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {loading ? (
            <div className="px-4 py-3 text-sm text-slate-500">Searching...</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500">No results found</div>
          ) : (
            <ul className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => handleSelect(r)}
                    className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm text-slate-950 dark:text-slate-50">
                        {r.customer_name}
                      </span>
                      <span className={`badge text-xs ${STATUS_COLORS[r.status] || ""}`}>
                        {STATUS_LABELS[r.status] || r.status}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        {formatDateDisplay(r.appointment_date)}
                      </span>
                      {r.customer_phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={11} />
                          {r.customer_phone}
                        </span>
                      )}
                      {r.plate_number && (
                        <span className="flex items-center gap-1">
                          <Car size={11} />
                          {r.plate_number}
                        </span>
                      )}
                      {r.branch && (
                        <span className="font-medium text-slate-400">
                          {r.branch.code} · {r.advisor?.name}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
