"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, ArrowRight, AlertCircle, CheckCircle2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cityRates,
  findCityRate,
  accessorialFees,
  type CityRate,
} from "@/lib/data/pricing-rates";
import { Analytics } from "@/lib/analytics";

interface PriceEstimatorProps {
  onGetFullQuote?: () => void;
}

export function PriceEstimator({ onGetFullQuote }: PriceEstimatorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState<CityRate | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Filter cities based on search term
  const suggestions = useMemo(() => {
    if (searchTerm.length < 2) return [];
    const normalized = searchTerm.toLowerCase();
    return cityRates
      .filter((r) => r.city.toLowerCase().includes(normalized))
      .slice(0, 6);
  }, [searchTerm]);

  const handleCitySelect = (city: CityRate) => {
    setSelectedCity(city);
    setSearchTerm(city.city);
    setShowSuggestions(false);
    setNotFound(false);
    // Track price estimate viewed
    Analytics.priceEstimateViewed(city.city, city.totalRate);
  };

  const handleSearch = () => {
    if (searchTerm.length < 2) {
      setNotFound(true);
      setSelectedCity(null);
      return;
    }

    const result = findCityRate(searchTerm);
    if (result) {
      setSelectedCity(result);
      setSearchTerm(result.city);
      setNotFound(false);
      // Track price estimate viewed
      Analytics.priceEstimateViewed(result.city, result.totalRate);
    } else {
      setSelectedCity(null);
      setNotFound(true);
    }
    setShowSuggestions(false);
  };

  const handleInputChange = (value: string) => {
    setSearchTerm(value);
    setSelectedCity(null);
    setNotFound(false);
    setShowSuggestions(value.length >= 2);
  };

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Quick Price Estimate</h3>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        Get an instant price estimate. For an exact quote, complete the full form below.
      </p>

      <div className="space-y-4">
        {/* City Search */}
        <div className="relative">
          <Label htmlFor="estimateCity" className="text-sm font-medium">
            Delivery City
          </Label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="estimateCity"
              type="text"
              placeholder="Search city (e.g., Carson, Ontario)"
              value={searchTerm}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => searchTerm.length >= 2 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              className="pl-9"
            />
          </div>

          {/* Suggestions Dropdown */}
          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg"
              >
                {suggestions.map((city) => (
                  <button
                    key={city.city}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleCitySelect(city)}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors first:rounded-t-md last:rounded-b-md flex justify-between items-center"
                  >
                    <span>{city.city}</span>
                    <span className="text-muted-foreground">${city.totalRate.toFixed(0)}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Get Estimate Button */}
        <Button
          type="button"
          onClick={handleSearch}
          variant="secondary"
          className="w-full"
          disabled={searchTerm.length < 2}
        >
          <Calculator className="mr-2 h-4 w-4" />
          Get Estimate
        </Button>

        {/* Results */}
        <AnimatePresence mode="wait">
          {selectedCity && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 mt-2">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    {selectedCity.city}
                  </span>
                </div>

                <div className="text-center py-2">
                  <p className="text-sm text-muted-foreground mb-1">
                    Estimated Price
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    ${selectedCity.totalRate.toFixed(0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Includes {accessorialFees.fuelSurchargePercent}% fuel surcharge
                  </p>
                </div>

                <div className="text-xs text-muted-foreground mt-3 space-y-1">
                  <p className="flex items-start gap-1">
                    <span className="shrink-0">•</span>
                    <span>Round-trip port delivery rate</span>
                  </p>
                  <p className="flex items-start gap-1">
                    <span className="shrink-0">•</span>
                    <span>Standard container (20&apos;, 40&apos;, 40&apos; HC, 45&apos;)</span>
                  </p>
                  <p className="flex items-start gap-1">
                    <span className="shrink-0">•</span>
                    <span>Accessorial fees may apply based on requirements</span>
                  </p>
                </div>

                {onGetFullQuote && (
                  <Button
                    type="button"
                    onClick={onGetFullQuote}
                    className="w-full mt-4"
                  >
                    Get Exact Quote
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {notFound && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-lg bg-muted border border-border p-4 mt-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">
                      City not in service area
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      We may still be able to help! Submit a full quote request and we&apos;ll provide custom pricing.
                    </p>
                    {onGetFullQuote && (
                      <Button
                        type="button"
                        onClick={onGetFullQuote}
                        variant="outline"
                        size="sm"
                        className="mt-3"
                      >
                        Request Custom Quote
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Additional Fees Note */}
      <div className="mt-6 pt-4 border-t">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Additional fees may apply:
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>• Pre-pull: ${accessorialFees.prepull}</span>
          <span>• Overweight: ${accessorialFees.overweight}</span>
          <span>• Chassis: ${accessorialFees.chassisRental}/day</span>
          <span>• Storage: ${accessorialFees.yardStorage}/day</span>
        </div>
      </div>
    </div>
  );
}
