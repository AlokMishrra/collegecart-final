import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Product } from "@/entities/Product";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Package } from "lucide-react";

export default function ComboManagement() {
  const [combos, setCombos] = useState([]);
  const [products, setProducts] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCombo, setEditCombo] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", price: "", original_price: "", product_ids: [], image_url: "", is_active: true });
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadCombos();
    Product.filter({ is_available: true }, '-created_date', 200).then(setProducts).catch(() => {});
  }, []);

  const loadCombos = () => {
    base44.entities.Combo.list('-created_date', 50).then(setCombos).catch(() => {});
  };

  const openNew = () => {
    setEditCombo(null);
    setForm({ name: "", description: "", price: "", original_price: "", product_ids: [], image_url: "", is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (combo) => {
    setEditCombo(combo);
    setForm({ ...combo });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const selectedProducts = products.filter(p => form.product_ids.includes(p.id));
    const data = {
      ...form,
      price: parseFloat(form.price),
      original_price: parseFloat(form.original_price) || null,
      product_names: selectedProducts.map(p => p.name)
    };
    if (editCombo) {
      await base44.entities.Combo.update(editCombo.id, data);
    } else {
      await base44.entities.Combo.create(data);
    }
    loadCombos();
    setDialogOpen(false);
  };

  const handleDelete = async (id) => {
    if (confirm("Delete this combo?")) {
      await base44.entities.Combo.delete(id);
      loadCombos();
    }
  };

  const toggleProduct = (productId) => {
    setForm(prev => ({
      ...prev,
      product_ids: prev.product_ids.includes(productId)
        ? prev.product_ids.filter(id => id !== productId)
        : [...prev.product_ids, productId]
    }));
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Combo Products</h2>
          <p className="text-gray-600">Create bundled combos shown at top of shop</p>
        </div>
        <Button className="bg-yellow-500 hover:bg-yellow-600" onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" />New Combo
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {combos.map(combo => (
          <Card key={combo.id} className={`border-2 ${combo.is_active ? 'border-yellow-300' : 'border-gray-200 opacity-60'}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <Badge className="bg-yellow-100 text-yellow-800 text-xs mb-1">⭐ COMBO</Badge>
                  <h3 className="font-bold">{combo.name}</h3>
                  <p className="text-xs text-gray-500">{combo.description}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => openEdit(combo)}><Edit className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="outline" className="h-7 w-7 text-red-600" onClick={() => handleDelete(combo.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {(combo.product_names || []).map((n, i) => (
                  <span key={i} className="text-[10px] bg-gray-100 rounded px-1.5 py-0.5">{n}</span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-600">₹{combo.price}</span>
                {combo.original_price && <span className="text-sm text-gray-400 line-through">₹{combo.original_price}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
        {combos.length === 0 && (
          <Card className="col-span-3">
            <CardContent className="p-10 text-center text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              No combos yet. Create your first combo!
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editCombo ? "Edit Combo" : "Create Combo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Combo Name</Label>
              <Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="e.g. Breakfast Bundle" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="Short description..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Combo Price (₹)</Label>
                <Input type="number" value={form.price} onChange={e => setForm(p => ({...p, price: e.target.value}))} />
              </div>
              <div>
                <Label>Original Price (₹)</Label>
                <Input type="number" value={form.original_price} onChange={e => setForm(p => ({...p, original_price: e.target.value}))} placeholder="Sum of items" />
              </div>
            </div>
            <div>
              <Label>Image URL (optional)</Label>
              <Input value={form.image_url} onChange={e => setForm(p => ({...p, image_url: e.target.value}))} placeholder="https://..." />
            </div>
            <div>
              <Label className="mb-2 block">Select Products ({form.product_ids.length} selected)</Label>
              <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="mb-2" />
              <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                {filteredProducts.map(p => (
                  <label key={p.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" checked={form.product_ids.includes(p.id)} onChange={() => toggleProduct(p.id)} className="w-4 h-4" />
                    <span className="text-sm flex-1">{p.name}</span>
                    <span className="text-xs text-emerald-600 font-medium">₹{p.price}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-yellow-500 hover:bg-yellow-600" onClick={handleSave} disabled={!form.name || !form.price || form.product_ids.length < 2}>
              {editCombo ? "Update" : "Create"} Combo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}