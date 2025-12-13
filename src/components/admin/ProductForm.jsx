import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sparkles } from "lucide-react";
import ImageUploader from "../shared/ImageUploader";
import AIDescriptionGenerator from "./AIDescriptionGenerator";

export default function ProductForm({ product, categories, onSave, onCancel }) {
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [formData, setFormData] = useState({
    name: product?.name || "",
    description: product?.description || "",
    price: product?.price || "",
    original_price: product?.original_price || "",
    category_id: product?.category_id || "",
    image_url: product?.image_url || "",
    stock_quantity: product?.stock_quantity || 0,
    hostel_stock: product?.hostel_stock || {
      Mithali: 0,
      Gavaskar: 0,
      Virat: 0,
      Tendulkar: 0,
      Other: 0
    },
    unit: product?.unit || "piece",
    is_available: product?.is_available ?? true,
    delivery_charge: product?.delivery_charge || 0,
    profit_margin: product?.profit_margin || 0,
    delivery_time: product?.delivery_time || "13 mins",
    available_from: product?.available_from || "",
    available_to: product?.available_to || ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const totalStock = parseInt(formData.stock_quantity);
    onSave({
      ...formData,
      price: parseFloat(formData.price),
      original_price: formData.original_price ? parseFloat(formData.original_price) : null,
      stock_quantity: totalStock,
      hostel_stock: {
        Mithali: formData.hostel_stock.Mithali !== "" ? parseInt(formData.hostel_stock.Mithali) : 0,
        Gavaskar: formData.hostel_stock.Gavaskar !== "" ? parseInt(formData.hostel_stock.Gavaskar) : 0,
        Virat: formData.hostel_stock.Virat !== "" ? parseInt(formData.hostel_stock.Virat) : 0,
        Tendulkar: formData.hostel_stock.Tendulkar !== "" ? parseInt(formData.hostel_stock.Tendulkar) : 0,
        Other: formData.hostel_stock.Other !== "" ? parseInt(formData.hostel_stock.Other) : 0
      },
      delivery_charge: parseFloat(formData.delivery_charge) || 0,
      profit_margin: parseFloat(formData.profit_margin) || 0,
      delivery_time: formData.delivery_time
    });
  };

  const handleHostelStockChange = (hostel, value) => {
    setFormData(prev => ({
      ...prev,
      hostel_stock: {
        ...prev.hostel_stock,
        [hostel]: value
      }
    }));
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Product Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category_id} onValueChange={(value) => handleInputChange("category_id", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Price (₹)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleInputChange("price", e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="original_price">Original Price (₹)</Label>
              <Input
                id="original_price"
                type="number"
                step="0.01"
                value={formData.original_price}
                onChange={(e) => handleInputChange("original_price", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="stock">Total Stock Quantity</Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock_quantity}
                onChange={(e) => handleInputChange("stock_quantity", e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="unit">Unit</Label>
              <Select value={formData.unit} onValueChange={(value) => handleInputChange("unit", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="piece">Piece</SelectItem>
                  <SelectItem value="kg">Kilogram</SelectItem>
                  <SelectItem value="gram">Gram</SelectItem>
                  <SelectItem value="liter">Liter</SelectItem>
                  <SelectItem value="ml">Milliliter</SelectItem>
                  <SelectItem value="packet">Packet</SelectItem>
                  <SelectItem value="box">Box</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="mb-3 block">Hostel-wise Stock</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mithali" className="text-sm">Mithali Hostel</Label>
                <Input
                  id="mithali"
                  type="number"
                  value={formData.hostel_stock.Mithali}
                  onChange={(e) => handleHostelStockChange("Mithali", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="gavaskar" className="text-sm">Gavaskar Hostel</Label>
                <Input
                  id="gavaskar"
                  type="number"
                  value={formData.hostel_stock.Gavaskar}
                  onChange={(e) => handleHostelStockChange("Gavaskar", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="virat" className="text-sm">Virat Hostel</Label>
                <Input
                  id="virat"
                  type="number"
                  value={formData.hostel_stock.Virat}
                  onChange={(e) => handleHostelStockChange("Virat", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="tendulkar" className="text-sm">Tendulkar Hostel</Label>
                <Input
                  id="tendulkar"
                  type="number"
                  value={formData.hostel_stock.Tendulkar}
                  onChange={(e) => handleHostelStockChange("Tendulkar", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="other" className="text-sm">Other</Label>
                <Input
                  id="other"
                  type="number"
                  value={formData.hostel_stock.Other}
                  onChange={(e) => handleHostelStockChange("Other", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="delivery_charge">Delivery Charge (₹)</Label>
              <Input
                id="delivery_charge"
                type="number"
                step="0.01"
                value={formData.delivery_charge}
                onChange={(e) => handleInputChange("delivery_charge", e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">0 for free delivery</p>
            </div>
            <div>
              <Label htmlFor="profit_margin">Profit Margin (%)</Label>
              <Input
                id="profit_margin"
                type="number"
                step="0.01"
                value={formData.profit_margin}
                onChange={(e) => handleInputChange("profit_margin", e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">For recommendations</p>
            </div>
          </div>

          <div>
            <Label htmlFor="delivery_time">Delivery Time</Label>
            <Input
              id="delivery_time"
              value={formData.delivery_time}
              onChange={(e) => handleInputChange("delivery_time", e.target.value)}
              placeholder="e.g., 13 mins, 20 mins"
            />
            <p className="text-xs text-gray-500 mt-1">Estimated delivery time shown to customers</p>
          </div>

          <div>
            <Label className="mb-3 block">Availability Timing (Optional)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="available_from" className="text-sm">From (24-hour)</Label>
                <Input
                  id="available_from"
                  type="time"
                  value={formData.available_from}
                  onChange={(e) => handleInputChange("available_from", e.target.value)}
                  placeholder="08:00"
                />
              </div>
              <div>
                <Label htmlFor="available_to" className="text-sm">To (24-hour)</Label>
                <Input
                  id="available_to"
                  type="time"
                  value={formData.available_to}
                  onChange={(e) => handleInputChange("available_to", e.target.value)}
                  placeholder="22:00"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Leave empty for 24/7 availability</p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="available"
              checked={formData.is_available}
              onCheckedChange={(checked) => handleInputChange("is_available", checked)}
            />
            <Label htmlFor="available">Available for sale</Label>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="description">Description</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAIGenerator(!showAIGenerator)}
                className="text-purple-600 border-purple-300"
              >
                <Sparkles className="w-3 h-3 mr-1" />
                {showAIGenerator ? "Hide" : "AI Generator"}
              </Button>
            </div>
            {showAIGenerator && (
              <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <AIDescriptionGenerator
                  productName={formData.name}
                  onSelectDescription={(desc) => {
                    setFormData({ ...formData, description: desc });
                    setShowAIGenerator(false);
                  }}
                />
              </div>
            )}
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              rows={4}
            />
          </div>

          <ImageUploader
            currentImage={formData.image_url}
            onImageSelect={(url) => handleInputChange("image_url", url)}
            placeholder="https://images.unsplash.com/photo-1542838132-92c53300491e?w=300"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
          {product ? "Update Product" : "Create Product"}
        </Button>
      </div>
    </form>
  );
}