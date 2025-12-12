import React, { useState, useEffect, useRef } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function EnhancedSearch({ 
  products, 
  onSearch, 
  filters, 
  onFilterChange,
  sortBy,
  onSortChange 
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length > 1) {
      // Fuzzy search - match partial words
      const searchTerms = query.toLowerCase().split(" ");
      const matches = products.filter(product => {
        const productText = `${product.name} ${product.description || ""}`.toLowerCase();
        return searchTerms.some(term => productText.includes(term));
      }).slice(0, 5);
      setSuggestions(matches);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query, products]);

  const handleSearch = (searchQuery) => {
    setQuery(searchQuery);
    onSearch(searchQuery);
    setShowSuggestions(false);
  };

  const clearFilters = () => {
    setQuery("");
    setPriceRange([0, 1000]);
    onFilterChange({ availability: "all", rating: "all" });
    onSortChange("relevance");
    onSearch("");
  };

  const hasActiveFilters = query || 
    filters.availability !== "all" || 
    filters.rating !== "all" || 
    sortBy !== "relevance" ||
    priceRange[0] > 0 || 
    priceRange[1] < 1000;

  return (
    <div className="space-y-4" ref={searchRef}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search for products..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch(query)}
            className="pl-10 h-12 w-full"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                onSearch("");
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Auto-suggestions */}
          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
              >
                {suggestions.map((product) => (
                  <Link
                    key={product.id}
                    to={createPageUrl("ProductDetails") + `?id=${product.id}`}
                    onClick={() => setShowSuggestions(false)}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
                  >
                    <img
                      src={product.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=60"}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{product.name}</p>
                      <p className="text-sm text-emerald-600">₹{product.price}</p>
                    </div>
                  </Link>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Filters Button */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-12 px-4">
              <SlidersHorizontal className="w-5 h-5 mr-2" />
              Filters
              {hasActiveFilters && (
                <Badge className="ml-2 bg-emerald-600">•</Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Filters & Sort</h4>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear All
                  </Button>
                )}
              </div>

              {/* Sort By */}
              <div className="space-y-2">
                <Label>Sort By</Label>
                <RadioGroup value={sortBy} onValueChange={onSortChange}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="relevance" id="relevance" />
                    <Label htmlFor="relevance" className="font-normal cursor-pointer">Relevance</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="price_low" id="price_low" />
                    <Label htmlFor="price_low" className="font-normal cursor-pointer">Price: Low to High</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="price_high" id="price_high" />
                    <Label htmlFor="price_high" className="font-normal cursor-pointer">Price: High to Low</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="rating" id="rating" />
                    <Label htmlFor="rating" className="font-normal cursor-pointer">Highest Rated</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Price Range */}
              <div className="space-y-2">
                <Label>Price Range</Label>
                <div className="px-2">
                  <Slider
                    value={priceRange}
                    onValueChange={(value) => {
                      setPriceRange(value);
                      onFilterChange({ ...filters, priceRange: value });
                    }}
                    max={1000}
                    step={10}
                    className="mb-2"
                  />
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>₹{priceRange[0]}</span>
                    <span>₹{priceRange[1]}</span>
                  </div>
                </div>
              </div>

              {/* Availability */}
              <div className="space-y-2">
                <Label>Availability</Label>
                <RadioGroup 
                  value={filters.availability} 
                  onValueChange={(value) => onFilterChange({ ...filters, availability: value })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="all_avail" />
                    <Label htmlFor="all_avail" className="font-normal cursor-pointer">All Products</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="in_stock" id="in_stock" />
                    <Label htmlFor="in_stock" className="font-normal cursor-pointer">In Stock Only</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Rating Filter */}
              <div className="space-y-2">
                <Label>Minimum Rating</Label>
                <RadioGroup 
                  value={filters.rating} 
                  onValueChange={(value) => onFilterChange({ ...filters, rating: value })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="all_rating" />
                    <Label htmlFor="all_rating" className="font-normal cursor-pointer">All Ratings</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="4" id="4_star" />
                    <Label htmlFor="4_star" className="font-normal cursor-pointer">4★ & Above</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="3" id="3_star" />
                    <Label htmlFor="3_star" className="font-normal cursor-pointer">3★ & Above</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {query && (
            <Badge variant="secondary" className="gap-1">
              Search: {query}
              <button onClick={() => handleSearch("")} className="ml-1">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {sortBy !== "relevance" && (
            <Badge variant="secondary">
              Sort: {sortBy === "price_low" ? "Price ↑" : sortBy === "price_high" ? "Price ↓" : "Rating"}
            </Badge>
          )}
          {filters.availability !== "all" && (
            <Badge variant="secondary">In Stock Only</Badge>
          )}
          {filters.rating !== "all" && (
            <Badge variant="secondary">{filters.rating}★ & Above</Badge>
          )}
        </div>
      )}
    </div>
  );
}