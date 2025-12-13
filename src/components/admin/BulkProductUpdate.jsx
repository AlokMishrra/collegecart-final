import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function BulkProductUpdate() {
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [updateData, setUpdateData] = useState({
    price: "",
    original_price: "",
    stock_quantity: "",
    hostel_stock_mithali: "",
    hostel_stock_gavaskar: "",
    hostel_stock_virat: "",
    hostel_stock_tendulkar: "",
    hostel_stock_other: "",
    delivery_charge: "",
    delivery_time: "",
    available_from: "",
    available_to: "",
    is_available: "",
    category_id: "",
    unit: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, categoriesData] = await Promise.all([
        base44.entities.Product.list('-created_date'),
        base44.entities.Category.list()
      ]);
      setAllProducts(productsData);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const filterByCategory = (categoryId) => {
    setSelectedCategory(categoryId);
    if (categoryId === "all") {
      setProducts(allProducts);
    } else {
      setProducts(allProducts.filter(p => p.category_id === categoryId));
    }
    setSelectedProducts([]);
  };

  const toggleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map(p => p.id));
    }
  };

  const toggleProduct = (productId) => {
    setSelectedProducts(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  const handleBulkUpdate = async () => {
    if (selectedProducts.length === 0) {
      toast.error("Please select at least one product");
      return;
    }

    setIsLoading(true);
    try {
      const updates = {};
      
      // Only include fields that have values
      if (updateData.price) updates.price = parseFloat(updateData.price);
      if (updateData.original_price) updates.original_price = parseFloat(updateData.original_price);
      if (updateData.stock_quantity) updates.stock_quantity = parseInt(updateData.stock_quantity);
      if (updateData.delivery_charge) updates.delivery_charge = parseFloat(updateData.delivery_charge);
      if (updateData.delivery_time) updates.delivery_time = updateData.delivery_time;
      if (updateData.available_from) updates.available_from = updateData.available_from;
      if (updateData.available_to) updates.available_to = updateData.available_to;
      if (updateData.is_available !== "") updates.is_available = updateData.is_available === "true";
      if (updateData.category_id) updates.category_id = updateData.category_id;
      if (updateData.unit) updates.unit = updateData.unit;

      // Handle hostel stock updates
      if (updateData.hostel_stock_mithali || updateData.hostel_stock_gavaskar || 
          updateData.hostel_stock_virat || updateData.hostel_stock_tendulkar || updateData.hostel_stock_other) {
        
        // For each selected product, merge with existing hostel stock
        for (const productId of selectedProducts) {
          const product = allProducts.find(p => p.id === productId);
          const existingStock = product?.hostel_stock || { Mithali: 0, Gavaskar: 0, Virat: 0, Tendulkar: 0, Other: 0 };
          
          updates.hostel_stock = { ...existingStock };
          if (updateData.hostel_stock_mithali) updates.hostel_stock.Mithali = parseInt(updateData.hostel_stock_mithali);
          if (updateData.hostel_stock_gavaskar) updates.hostel_stock.Gavaskar = parseInt(updateData.hostel_stock_gavaskar);
          if (updateData.hostel_stock_virat) updates.hostel_stock.Virat = parseInt(updateData.hostel_stock_virat);
          if (updateData.hostel_stock_tendulkar) updates.hostel_stock.Tendulkar = parseInt(updateData.hostel_stock_tendulkar);
          if (updateData.hostel_stock_other) updates.hostel_stock.Other = parseInt(updateData.hostel_stock_other);
        }
      }

      // Update each selected product
      for (const productId of selectedProducts) {
        const product = allProducts.find(p => p.id === productId);
        const finalUpdates = { ...updates };
        
        // Merge hostel stock if updating
        if (updates.hostel_stock) {
          const existingStock = product?.hostel_stock || { Mithali: 0, Gavaskar: 0, Virat: 0, Tendulkar: 0, Other: 0 };
          finalUpdates.hostel_stock = {
            ...existingStock,
            ...updates.hostel_stock
          };
        }
        
        await base44.entities.Product.update(productId, finalUpdates);
      }

      toast.success(`Successfully updated ${selectedProducts.length} products`);
      setSelectedProducts([]);
      setUpdateData({
        price: "",
        original_price: "",
        stock_quantity: "",
        hostel_stock_mithali: "",
        hostel_stock_gavaskar: "",
        hostel_stock_virat: "",
        hostel_stock_tendulkar: "",
        hostel_stock_other: "",
        delivery_charge: "",
        delivery_time: "",
        available_from: "",
        available_to: "",
        is_available: "",
        category_id: "",
        unit: ""
      });
      await loadData();
    } catch (error) {
      console.error("Error updating products:", error);
      toast.error("Failed to update products");
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Package className="w-6 h-6 text-emerald-600" />
          Bulk Product Update
        </h2>
        <p className="text-gray-600">Select products and update their properties in bulk</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Product Selection */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <CardTitle>Select Products ({selectedProducts.length})</CardTitle>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedProducts.length === products.length && products.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm">Select All</span>
                </div>
              </div>
              
              <div>
                <Label className="text-xs mb-1 block">Filter by Category</Label>
                <Select value={selectedCategory} onValueChange={filterByCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories ({allProducts.length})</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name} ({allProducts.filter(p => p.category_id === cat.id).length})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[600px] overflow-y-auto space-y-2">
              {products.map(product => (
                <div
                  key={product.id}
                  className={`p-3 border rounded-lg flex items-center gap-3 cursor-pointer transition-colors ${
                    selectedProducts.includes(product.id) ? 'bg-emerald-50 border-emerald-300' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => toggleProduct(product.id)}
                >
                  <Checkbox
                    checked={selectedProducts.includes(product.id)}
                    onCheckedChange={() => toggleProduct(product.id)}
                  />
                  <img
                    src={product.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=50"}
                    alt={product.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{product.name}</p>
                    <p className="text-sm text-gray-600">₹{product.price} • Stock: {product.stock_quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Update Fields */}
        <Card>
          <CardHeader>
            <CardTitle>Update Fields</CardTitle>
            <p className="text-sm text-gray-600">Only filled fields will be updated</p>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price (₹)</Label>
                <Input
                  type="number"
                  placeholder="Leave empty to skip"
                  value={updateData.price}
                  onChange={(e) => setUpdateData({...updateData, price: e.target.value})}
                />
              </div>
              <div>
                <Label>Original Price (₹)</Label>
                <Input
                  type="number"
                  placeholder="Leave empty to skip"
                  value={updateData.original_price}
                  onChange={(e) => setUpdateData({...updateData, original_price: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label>Total Stock Quantity</Label>
              <Input
                type="number"
                placeholder="Leave empty to skip"
                value={updateData.stock_quantity}
                onChange={(e) => setUpdateData({...updateData, stock_quantity: e.target.value})}
              />
            </div>

            <div>
              <Label className="mb-2 block">Hostel-wise Stock</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Mithali</Label>
                  <Input
                    type="number"
                    placeholder="Skip"
                    value={updateData.hostel_stock_mithali}
                    onChange={(e) => setUpdateData({...updateData, hostel_stock_mithali: e.target.value})}
                  />
                </div>
                <div>
                  <Label className="text-xs">Gavaskar</Label>
                  <Input
                    type="number"
                    placeholder="Skip"
                    value={updateData.hostel_stock_gavaskar}
                    onChange={(e) => setUpdateData({...updateData, hostel_stock_gavaskar: e.target.value})}
                  />
                </div>
                <div>
                  <Label className="text-xs">Virat</Label>
                  <Input
                    type="number"
                    placeholder="Skip"
                    value={updateData.hostel_stock_virat}
                    onChange={(e) => setUpdateData({...updateData, hostel_stock_virat: e.target.value})}
                  />
                </div>
                <div>
                  <Label className="text-xs">Tendulkar</Label>
                  <Input
                    type="number"
                    placeholder="Skip"
                    value={updateData.hostel_stock_tendulkar}
                    onChange={(e) => setUpdateData({...updateData, hostel_stock_tendulkar: e.target.value})}
                  />
                </div>
                <div>
                  <Label className="text-xs">Other</Label>
                  <Input
                    type="number"
                    placeholder="Skip"
                    value={updateData.hostel_stock_other}
                    onChange={(e) => setUpdateData({...updateData, hostel_stock_other: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Delivery Charge (₹)</Label>
                <Input
                  type="number"
                  placeholder="Leave empty to skip"
                  value={updateData.delivery_charge}
                  onChange={(e) => setUpdateData({...updateData, delivery_charge: e.target.value})}
                />
              </div>
              <div>
                <Label>Delivery Time</Label>
                <Input
                  placeholder="e.g., 40 mins"
                  value={updateData.delivery_time}
                  onChange={(e) => setUpdateData({...updateData, delivery_time: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Available From (HH:MM)</Label>
                <Input
                  type="time"
                  value={updateData.available_from}
                  onChange={(e) => setUpdateData({...updateData, available_from: e.target.value})}
                />
              </div>
              <div>
                <Label>Available To (HH:MM)</Label>
                <Input
                  type="time"
                  value={updateData.available_to}
                  onChange={(e) => setUpdateData({...updateData, available_to: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label>Category</Label>
              <Select value={updateData.category_id} onValueChange={(value) => setUpdateData({...updateData, category_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Leave empty to skip" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Unit</Label>
              <Input
                placeholder="e.g., kg, piece, liter"
                value={updateData.unit}
                onChange={(e) => setUpdateData({...updateData, unit: e.target.value})}
              />
            </div>

            <div>
              <Label>Availability Status</Label>
              <Select value={updateData.is_available} onValueChange={(value) => setUpdateData({...updateData, is_available: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Leave empty to skip" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Available</SelectItem>
                  <SelectItem value="false">Unavailable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleBulkUpdate}
              disabled={isLoading || selectedProducts.length === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                `Update ${selectedProducts.length} Products`
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}