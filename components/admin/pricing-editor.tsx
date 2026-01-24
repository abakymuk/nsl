"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, DollarSign } from "lucide-react";
import { PricingBreakdown, PricingLineItem } from "@/types/database";

interface PricingEditorProps {
  initialBreakdown?: PricingBreakdown | null;
  onChange: (breakdown: PricingBreakdown) => void;
}

const DEFAULT_LINE_ITEMS: PricingLineItem[] = [
  { description: "Drayage - Port to Destination", amount: 0, type: "base" },
];

export function PricingEditor({ initialBreakdown, onChange }: PricingEditorProps) {
  const [items, setItems] = useState<PricingLineItem[]>(
    initialBreakdown?.items || DEFAULT_LINE_ITEMS
  );
  const [fees, setFees] = useState<{ description: string; amount: number }[]>(
    initialBreakdown?.fees || []
  );

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const feesTotal = fees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
  const total = subtotal + feesTotal;

  // Notify parent of changes
  useEffect(() => {
    const breakdown: PricingBreakdown = {
      items: items.filter(item => item.description.trim()),
      subtotal,
      fees: fees.length > 0 ? fees.filter(f => f.description.trim()) : undefined,
      total,
    };
    onChange(breakdown);
  }, [items, fees, subtotal, total, onChange]);

  const addLineItem = () => {
    setItems([...items, { description: "", amount: 0, type: "service" }]);
  };

  const updateLineItem = (index: number, field: keyof PricingLineItem, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const removeLineItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const addFee = () => {
    setFees([...fees, { description: "", amount: 0 }]);
  };

  const updateFee = (index: number, field: "description" | "amount", value: string | number) => {
    const updated = [...fees];
    updated[index] = { ...updated[index], [field]: value };
    setFees(updated);
  };

  const removeFee = (index: number) => {
    setFees(fees.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* Line Items */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Line Items</label>
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="text"
              value={item.description}
              onChange={(e) => updateLineItem(index, "description", e.target.value)}
              placeholder="Description"
              className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="relative w-28">
              <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="number"
                step="0.01"
                min="0"
                value={item.amount || ""}
                onChange={(e) => updateLineItem(index, "amount", parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full pl-7 pr-2 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <select
              value={item.type}
              onChange={(e) => updateLineItem(index, "type", e.target.value)}
              className="w-24 px-2 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="base">Base</option>
              <option value="service">Service</option>
              <option value="accessorial">Accessorial</option>
              <option value="fuel">Fuel</option>
              <option value="other">Other</option>
            </select>
            <button
              type="button"
              onClick={() => removeLineItem(index)}
              disabled={items.length <= 1}
              className="p-2 text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addLineItem}
          className="flex items-center gap-2 text-sm text-primary hover:text-primary/80"
        >
          <Plus className="h-4 w-4" />
          Add Line Item
        </button>
      </div>

      {/* Fees (Optional) */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Additional Fees (Optional)</label>
        {fees.map((fee, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="text"
              value={fee.description}
              onChange={(e) => updateFee(index, "description", e.target.value)}
              placeholder="Fee description"
              className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="relative w-28">
              <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="number"
                step="0.01"
                min="0"
                value={fee.amount || ""}
                onChange={(e) => updateFee(index, "amount", parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full pl-7 pr-2 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              type="button"
              onClick={() => removeFee(index)}
              className="p-2 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addFee}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
          Add Fee
        </button>
      </div>

      {/* Totals */}
      <div className="pt-4 border-t space-y-2">
        {fees.length > 0 && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Fees</span>
              <span>${feesTotal.toFixed(2)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between font-semibold text-lg">
          <span>Total</span>
          <span className="text-primary">${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
