import React, { useState, useEffect } from "react";
import { Product } from "@/entities/Product";
import { Category } from "@/entities/Category";
import { Notification } from "@/entities/Notification";
import { User } from "@/entities/User";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import ProductForm from "./ProductForm";
import ConfirmDialog from "../shared/ConfirmDialog";
import BulkProductImport from "./BulkProductImport";
import InventoryAlerts from "./InventoryAlerts";

export default function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, product: null });
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadData();
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
    } catch (error) {
      console.error("Error getting user:", error);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [productsData, categoriesData] = await Promise.all([
        Product.list('-created_date'),
        Category.list('name')
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const showNotification = async (title, message, type) => {
    if (user) {
      try {
        await Notification.create({
          user_id: user.id,
          title,
          message,
          type
        });
      } catch (error) {
        console.error("Error creating notification:", error);
      }
    }
  };

  const handleSaveProduct = async (productData) => {
    try {
      if (selectedProduct) {
        // Verify product still exists before updating
        const allProducts = await Product.list();
        const productExists = allProducts.find(p => p.id === selectedProduct.id);
        
        if (!productExists) {
          await showNotification(
            "Product Not Found",
            "This product no longer exists. The list has been refreshed.",
            "warning"
          );
          await loadData();
          setIsFormOpen(false);
          setSelectedProduct(null);
          return;
        }
        
        await Product.update(selectedProduct.id, productData);
        await showNotification(
          "Product Updated",
          `${productData.name} has been updated successfully`,
          "success"
        );
      } else {
        await Product.create(productData);
        await showNotification(
          "Product Added",
          `${productData.name} has been added to your catalog`,
          "success"
        );
      }
      await loadData();
      setIsFormOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error("Error saving product:", error);
      await showNotification(
        "Error",
        "Failed to save product. Please try again.",
        "error"
      );
      await loadData();
      setIsFormOpen(false);
      setSelectedProduct(null);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteDialog.product) return;
    
    try {
      await Product.delete(deleteDialog.product.id);
      await showNotification(
        "Product Deleted",
        `${deleteDialog.product.name} has been deleted successfully`,
        "success"
      );
      loadData();
    } catch (error) {
      console.error("Error deleting product:", error);
      await showNotification(
        "Delete Failed",
        "Failed to delete product. Please try again.",
        "error"
      );
    }
    setDeleteDialog({ open: false, product: null });
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : "Unknown";
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Bulk Import/Export */}
      <BulkProductImport />

      {/* Inventory Alerts */}
      <InventoryAlerts />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Products</h2>
          <p className="text-gray-600">Manage your product catalog</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {selectedProduct ? "Edit Product" : "Add New Product"}
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto flex-1 pr-2">
              <ProductForm
                product={selectedProduct}
                categories={categories}
                onSave={handleSaveProduct}
                onCancel={() => {
                  setIsFormOpen(false);
                  setSelectedProduct(null);
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <img
                        src={product.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=100"}
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded-lg"
                        onError={(e) => {
                          e.target.src = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=100";
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-gray-500 truncate max-w-xs">
                          {product.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{getCategoryName(product.category_id)}</TableCell>
                    <TableCell>₹{product.price}</TableCell>
                    <TableCell>{product.stock_quantity}</TableCell>
                    <TableCell>
                      <Badge variant={product.is_available ? "default" : "secondary"}>
                        {product.is_available ? "Available" : "Unavailable"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setSelectedProduct(product);
                            setIsFormOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setDeleteDialog({ open: true, product })}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title="Delete Product"
        description={`Are you sure you want to delete "${deleteDialog.product?.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteProduct}
        onCancel={() => setDeleteDialog({ open: false, product: null })}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}