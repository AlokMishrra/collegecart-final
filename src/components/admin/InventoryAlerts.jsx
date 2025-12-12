import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function InventoryAlerts() {
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState({});

  useEffect(() => {
    loadInventoryAlerts();
  }, []);

  const loadInventoryAlerts = async () => {
    setIsLoading(true);
    try {
      const products = await base44.entities.Product.list();
      const categoriesData = await base44.entities.Category.list();
      
      const categoryMap = {};
      categoriesData.forEach(cat => categoryMap[cat.id] = cat);
      setCategories(categoryMap);

      // Find products with low stock
      const lowStock = products.filter(product => {
        const threshold = product.low_stock_threshold || 10;
        
        // Check main stock
        if (product.stock_quantity <= threshold) return true;
        
        // Check hostel stocks
        if (product.hostel_stock) {
          const hostelStocks = Object.values(product.hostel_stock);
          if (hostelStocks.some(stock => stock <= threshold)) return true;
        }
        
        return false;
      });

      setLowStockProducts(lowStock);
    } catch (error) {
      console.error("Error loading inventory alerts:", error);
    }
    setIsLoading(false);
  };

  const getStockLevel = (quantity, threshold) => {
    if (quantity === 0) return { label: "Out of Stock", color: "bg-red-100 text-red-800" };
    if (quantity <= threshold / 2) return { label: "Critical", color: "bg-red-100 text-red-800" };
    if (quantity <= threshold) return { label: "Low Stock", color: "bg-orange-100 text-orange-800" };
    return { label: "In Stock", color: "bg-green-100 text-green-800" };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inventory Alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array(3).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          Inventory Alerts ({lowStockProducts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {lowStockProducts.length === 0 ? (
          <Alert className="bg-green-50 border-green-200">
            <Package className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800">
              All products are well stocked! No inventory alerts at this time.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {lowStockProducts.map(product => {
              const threshold = product.low_stock_threshold || 10;
              const mainStockLevel = getStockLevel(product.stock_quantity, threshold);

              return (
                <div
                  key={product.id}
                  className="border border-orange-200 bg-orange-50 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-600">
                        {categories[product.category_id]?.name || "Uncategorized"}
                      </p>
                    </div>
                    <Badge className={mainStockLevel.color}>
                      {mainStockLevel.label}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Total Stock:</span>
                      <span className={`font-medium ${product.stock_quantity === 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        {product.stock_quantity} units
                      </span>
                    </div>

                    {/* Hostel Stocks */}
                    {product.hostel_stock && (
                      <div className="border-t pt-2 mt-2">
                        <p className="text-xs text-gray-600 mb-2">Hostel Stock:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(product.hostel_stock).map(([hostel, stock]) => {
                            const hostelLevel = getStockLevel(stock, threshold);
                            return (
                              <div key={hostel} className="flex items-center justify-between text-xs">
                                <span className="text-gray-600">{hostel}:</span>
                                <Badge variant="outline" className={hostelLevel.color}>
                                  {stock}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}