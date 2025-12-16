import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Edit, Trash2, Upload, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import * as XLSX from "xlsx";

export default function DhabaMenuManagement() {
  const [menuItems, setMenuItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    dhaba_name: "",
    item_name: "",
    price: "",
    is_available: true
  });

  useEffect(() => {
    loadMenuItems();
  }, []);

  const loadMenuItems = async () => {
    setIsLoading(true);
    try {
      const items = await base44.entities.DhabaMenu.list('dhaba_name');
      setMenuItems(items);
    } catch (error) {
      console.error("Error loading menu:", error);
    }
    setIsLoading(false);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      dhaba_name: "",
      item_name: "",
      price: "",
      is_available: true
    });
    setShowDialog(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      dhaba_name: item.dhaba_name,
      item_name: item.item_name,
      price: item.price,
      is_available: item.is_available
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    try {
      const data = {
        dhaba_name: formData.dhaba_name,
        item_name: formData.item_name,
        price: parseFloat(formData.price),
        is_available: formData.is_available
      };

      if (editingItem) {
        await base44.entities.DhabaMenu.update(editingItem.id, data);
      } else {
        await base44.entities.DhabaMenu.create(data);
      }

      setShowDialog(false);
      loadMenuItems();
    } catch (error) {
      console.error("Error saving menu item:", error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this menu item?")) return;
    try {
      await base44.entities.DhabaMenu.delete(id);
      loadMenuItems();
    } catch (error) {
      console.error("Error deleting menu item:", error);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Create menu items from Excel
      for (const row of jsonData) {
        await base44.entities.DhabaMenu.create({
          dhaba_name: row['Dhaba Name'] || row.dhaba_name,
          item_name: row['Item Name'] || row.item_name,
          price: parseFloat(row['Price'] || row.price),
          is_available: true
        });
      }

      loadMenuItems();
      alert("Menu uploaded successfully!");
    } catch (error) {
      console.error("Error uploading menu:", error);
      alert("Error uploading menu. Please check file format.");
    }
  };

  const exportToExcel = () => {
    const data = menuItems.map(item => ({
      'Dhaba Name': item.dhaba_name,
      'Item Name': item.item_name,
      'Price': item.price,
      'Available': item.is_available ? 'Yes' : 'No'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Menu');
    XLSX.writeFile(wb, 'dhaba-menu.xlsx');
  };

  const groupedMenu = menuItems.reduce((acc, item) => {
    if (!acc[item.dhaba_name]) acc[item.dhaba_name] = [];
    acc[item.dhaba_name].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dhaba Menu Management</h2>
          <p className="text-gray-600">Upload and manage menu items from different dhabas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToExcel}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <label>
            <Button variant="outline" asChild>
              <span>
                <Upload className="w-4 h-4 mr-2" />
                Upload Excel
              </span>
            </Button>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <Button onClick={handleAdd} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {Object.keys(groupedMenu).length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-600 mb-4">No menu items yet. Add items or upload an Excel file.</p>
            <p className="text-xs text-gray-500">Excel format: Dhaba Name, Item Name, Price</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedMenu).map(([dhabaName, items]) => (
          <Card key={dhabaName}>
            <CardHeader>
              <CardTitle className="text-lg">{dhabaName}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.item_name}</TableCell>
                      <TableCell>₹{item.price.toFixed(2)}</TableCell>
                      <TableCell>
                        <span className={item.is_available ? "text-green-600" : "text-red-600"}>
                          {item.is_available ? "Available" : "Unavailable"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Dhaba Name</Label>
              <Input
                value={formData.dhaba_name}
                onChange={(e) => setFormData({ ...formData, dhaba_name: e.target.value })}
                placeholder="e.g., Dhaba 1, Canteen A"
              />
            </div>
            <div>
              <Label>Item Name</Label>
              <Input
                value={formData.item_name}
                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                placeholder="e.g., Aaloo Paratha, Chai"
              />
            </div>
            <div>
              <Label>Price (₹)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
              {editingItem ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}