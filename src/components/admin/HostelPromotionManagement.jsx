import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Tag, Building2 } from "lucide-react";
import ImageUploader from "../shared/ImageUploader";

export default function HostelPromotionManagement() {
  const [promotions, setPromotions] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    hostel: "All",
    promotion_type: "banner",
    discount_type: "percentage",
    discount_value: 0,
    banner_image: "",
    applicable_products: [],
    applicable_categories: [],
    min_order_amount: 0,
    start_date: "",
    end_date: "",
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [promos, prods, cats] = await Promise.all([
        base44.entities.HostelPromotion.list('-created_date'),
        base44.entities.Product.list(),
        base44.entities.Category.list()
      ]);
      setPromotions(promos);
      setProducts(prods);
      setCategories(cats);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleAdd = () => {
    setEditingPromotion(null);
    setFormData({
      title: "",
      description: "",
      hostel: "All",
      promotion_type: "banner",
      discount_type: "percentage",
      discount_value: 0,
      banner_image: "",
      applicable_products: [],
      applicable_categories: [],
      min_order_amount: 0,
      start_date: "",
      end_date: "",
      is_active: true
    });
    setShowDialog(true);
  };

  const handleEdit = (promo) => {
    setEditingPromotion(promo);
    setFormData({
      title: promo.title,
      description: promo.description || "",
      hostel: promo.hostel,
      promotion_type: promo.promotion_type,
      discount_type: promo.discount_type || "percentage",
      discount_value: promo.discount_value || 0,
      banner_image: promo.banner_image || "",
      applicable_products: promo.applicable_products || [],
      applicable_categories: promo.applicable_categories || [],
      min_order_amount: promo.min_order_amount || 0,
      start_date: promo.start_date,
      end_date: promo.end_date,
      is_active: promo.is_active
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    try {
      if (editingPromotion) {
        await base44.entities.HostelPromotion.update(editingPromotion.id, formData);
      } else {
        await base44.entities.HostelPromotion.create(formData);
      }
      setShowDialog(false);
      loadData();
    } catch (error) {
      console.error("Error saving promotion:", error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this promotion?")) return;
    try {
      await base44.entities.HostelPromotion.delete(id);
      loadData();
    } catch (error) {
      console.error("Error deleting promotion:", error);
    }
  };

  const toggleActive = async (promo) => {
    try {
      await base44.entities.HostelPromotion.update(promo.id, {
        is_active: !promo.is_active
      });
      loadData();
    } catch (error) {
      console.error("Error toggling promotion:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Hostel-Specific Promotions</h2>
          <p className="text-gray-600">Create targeted promotions for specific hostels</p>
        </div>
        <Button onClick={handleAdd} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" />
          New Promotion
        </Button>
      </div>

      <div className="grid gap-4">
        {promotions.map((promo) => (
          <Card key={promo.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{promo.title}</h3>
                    <Badge className="bg-emerald-100 text-emerald-800">
                      <Building2 className="w-3 h-3 mr-1" />
                      {promo.hostel}
                    </Badge>
                    <Badge variant="outline">
                      <Tag className="w-3 h-3 mr-1" />
                      {promo.promotion_type}
                    </Badge>
                    <Badge className={promo.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                      {promo.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{promo.description}</p>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>From: {new Date(promo.start_date).toLocaleDateString()}</span>
                    <span>To: {new Date(promo.end_date).toLocaleDateString()}</span>
                    <span>Used: {promo.usage_count} times</span>
                  </div>
                  {promo.promotion_type === "discount" && (
                    <p className="text-sm font-medium text-emerald-600 mt-2">
                      {promo.discount_type === "percentage" ? `${promo.discount_value}% OFF` : `₹${promo.discount_value} OFF`}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive(promo)}
                  >
                    {promo.is_active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(promo)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(promo.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPromotion ? "Edit" : "Create"} Promotion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Target Hostel *</Label>
                <Select value={formData.hostel} onValueChange={(val) => setFormData({ ...formData, hostel: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Hostels</SelectItem>
                    <SelectItem value="Mithali">Mithali</SelectItem>
                    <SelectItem value="Gavaskar">Gavaskar</SelectItem>
                    <SelectItem value="Virat">Virat</SelectItem>
                    <SelectItem value="Tendulkar">Tendulkar</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Promotion Type *</Label>
                <Select value={formData.promotion_type} onValueChange={(val) => setFormData({ ...formData, promotion_type: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="banner">Banner</SelectItem>
                    <SelectItem value="discount">Product Discount</SelectItem>
                    <SelectItem value="free_delivery">Free Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.promotion_type === "banner" && (
              <div>
                <Label>Banner Image</Label>
                <ImageUploader
                  currentImage={formData.banner_image}
                  onImageSelect={(url) => setFormData({ ...formData, banner_image: url })}
                  placeholder="Upload banner image"
                />
              </div>
            )}

            {formData.promotion_type === "discount" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Discount Type</Label>
                  <Select value={formData.discount_type} onValueChange={(val) => setFormData({ ...formData, discount_type: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Discount Value</Label>
                  <Input
                    type="number"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
            )}

            <div>
              <Label>Minimum Order Amount</Label>
              <Input
                type="number"
                value={formData.min_order_amount}
                onChange={(e) => setFormData({ ...formData, min_order_amount: parseFloat(e.target.value) })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>End Date *</Label>
                <Input
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
                {editingPromotion ? "Update" : "Create"} Promotion
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}