import React from 'react';
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSearch } from "@/context/SearchContext";

export const POSSearch: React.FC = () => {
  const { t } = useTranslation(["services"]);
  const { searchTerm, setSearchTerm, isSearchVisible } = useSearch();
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    const focusHandler = () => {
      // Use a small timeout to ensure element is mounted
      setTimeout(() => inputRef.current?.focus(), 0);
    };
    window.addEventListener('focus-pos-search', focusHandler);
    return () => window.removeEventListener('focus-pos-search', focusHandler);
  }, []);

  if (!isSearchVisible) {
    return null;
  }

  return (
    <div className="relative max-w-md w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        ref={inputRef}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const term = (e.currentTarget.value || '').trim();
            if (term.length > 0) {
              // Dispatch a global event so POSPage can handle add-to-order
              window.dispatchEvent(new CustomEvent('pos-search-enter', { detail: { term } }));
              // Optionally clear search box after action
              setSearchTerm('');
            }
          }
        }}
        placeholder={t("searchProductsByNameOrId", { ns: "services" })}
        className="pl-9 bg-muted/50 dark:bg-muted/20 border-border/50 focus:border-primary"
      />
    </div>
  );
}; 