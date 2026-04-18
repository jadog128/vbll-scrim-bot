"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useState } from "react";

export default function AdminSearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (query) {
      params.set("q", query);
    } else {
      params.delete("q");
    }
    router.push(`?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSearch} className="relative group w-full max-w-md">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" />
      </div>
      <input
        type="text"
        placeholder="Search Player, VRFS ID or ID..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="block w-full pl-11 pr-4 py-3 bg-white border border-outline-variant/10 rounded-2xl text-sm font-bold placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all shadow-sm group-hover:shadow-ambient"
      />
      {query && (
        <button 
          type="button"
          onClick={() => { setQuery(""); router.push('?'); }}
          className="absolute inset-y-0 right-0 pr-4 flex items-center text-[10px] font-black uppercase text-on-surface-variant opacity-40 hover:opacity-100 transition-opacity"
        >
          Clear
        </button>
      )}
    </form>
  );
}
