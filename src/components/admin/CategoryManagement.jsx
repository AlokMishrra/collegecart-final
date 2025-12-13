import React, { useState, useEffect } from "react";
import { Category } from "@/entities/Category";
import { Notification } from "@/entities/Notification";
import { User } from "@/entities/User";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import CategoryForm from "./CategoryForm";
import ConfirmDialog from "../shared/ConfirmDialog";

export default function CategoryManagement() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, category: null });
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadCategories();
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

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const categoriesData = await Category.list('name');
      setCategories(categoriesData);
    } catch (error) {
      console.error("Error loading categories:", error);
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

  const handleSaveCategory = async (categoryData) => {
    try {
      if (selectedCategory) {
        await Category.update(selectedCategory.id, categoryData);
        await showNotification(
          "Category Updated",
          `${categoryData.name} has been updated successfully`,
          "success"
        );
      } else {
        await Category.create(categoryData);
        await showNotification(
          "Category Created",
          `${categoryData.name} has been created successfully`,
          "success"
        );
      }
      loadCategories();
      setIsFormOpen(false);
      setSelectedCategory(null);
    } catch (error) {
      console.error("Error saving category:", error);
      await showNotification(
        "Error",
        "Failed to save category. Please try again.",
        "error"
      );
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteDialog.category) return;
    
    try {
      await Category.delete(deleteDialog.category.id);
      await showNotification(
        "Category Deleted",
        `${deleteDialog.category.name} has been deleted successfully`,
        "success"
      );
      loadCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      await showNotification(
        "Delete Failed",
        "Failed to delete category. Please try again.",
        "error"
      );
    }
    setDeleteDialog({ open: false, category: null });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Categories</h2>
          <p className="text-gray-600">Organize your products by categories</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedCategory ? "Edit Category" : "Add New Category"}
              </DialogTitle>
            </DialogHeader>
            <CategoryForm
              category={selectedCategory}
              onSave={handleSaveCategory}
              onCancel={() => {
                setIsFormOpen(false);
                setSelectedCategory(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <Card key={category.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <img
                    src={category.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200"}
                    alt={category.name}
                    className="w-full h-32 object-cover rounded-lg mb-4"
                    onError={(e) => {
                      e.target.src = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200";
                    }}
                  />
                  <h3 className="font-semibold text-lg mb-2">{category.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {category.description || "No description available"}
                  </p>
                  <Badge variant={category.is_active ? "default" : "secondary"}>
                    {category.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setSelectedCategory(category);
                    setIsFormOpen(true);
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setDeleteDialog({ open: true, category })}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title="Delete Category"
        description={`Are you sure you want to delete "${deleteDialog.category?.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteCategory}
        onCancel={() => setDeleteDialog({ open: false, category: null })}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}