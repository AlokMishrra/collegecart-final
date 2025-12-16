import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Edit, Trash2, Upload, Download, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as XLSX from "xlsx";

export default function DhabaMenuManagement() {
  const [menuItems, setMenuItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    dhaba_name: "",
    items: [{ item_name: "", price: "" }]
  });
  const [openDhabas, setOpenDhabas] = useState({});
  const [dhabaList, setDhabaList] = useState([]);
  const [newDhabaName, setNewDhabaName] = useState("");
  const [showAddDhabaDialog, setShowAddDhabaDialog] = useState(false);

  useEffect(() => {
    loadMenuItems();
    loadDhabas();
  }, []);

  const loadDhabas = async () => {
    try {
      const items = await base44.entities.DhabaMenu.list();
      const uniqueDhabas = [...new Set(items.map(item => item.dhaba_name))];
      setDhabaList(uniqueDhabas.sort());
    } catch (error) {
      console.error("Error loading dhabas:", error);
    }
  };

  const handleAddDhaba = () => {
    if (!newDhabaName.trim()) return;
    if (dhabaList.includes(newDhabaName.trim())) {
      alert("Dhaba already exists!");
      return;
    }
    setDhabaList([...dhabaList, newDhabaName.trim()].sort());
    setFormData({ ...formData, dhaba_name: newDhabaName.trim() });
    setNewDhabaName("");
    setShowAddDhabaDialog(false);
  };

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
      items: [{ item_name: "", price: "" }]
    });
    setShowDialog(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      dhaba_name: item.dhaba_name,
      items: [{ item_name: item.item_name, price: item.price }]
    });
    setShowDialog(true);
  };

  const addItemRow = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { item_name: "", price: "" }]
    });
  };

  const removeItemRow = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItemRow = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const handleSave = async () => {
    try {
      if (!formData.dhaba_name) {
        alert("Please select a dhaba name");
        return;
      }

      if (editingItem) {
        // Update single item
        await base44.entities.DhabaMenu.update(editingItem.id, {
          dhaba_name: formData.dhaba_name,
          item_name: formData.items[0].item_name,
          price: parseFloat(formData.items[0].price),
          is_available: true
        });
      } else {
        // Create multiple items
        for (const item of formData.items) {
          if (item.item_name && item.price) {
            await base44.entities.DhabaMenu.create({
              dhaba_name: formData.dhaba_name,
              item_name: item.item_name,
              price: parseFloat(item.price),
              is_available: true
            });
          }
        }
      }

      setShowDialog(false);
      loadMenuItems();
      loadDhabas();
    } catch (error) {
      console.error("Error saving menu items:", error);
      alert("Error saving items. Please try again.");
    }
  };

  const handleDialogFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!formData.dhaba_name) {
      alert("Please select a dhaba name first");
      e.target.value = "";
      return;
    }

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Extract items from uploaded file
      const newItems = jsonData.map(row => ({
        item_name: row['Item Name'] || row.item_name || "",
        price: row['Price'] || row.price || ""
      })).filter(item => item.item_name && item.price);

      if (newItems.length === 0) {
        alert("No valid items found in file. Please check format: Item Name, Price");
        e.target.value = "";
        return;
      }

      setFormData({ ...formData, items: newItems });
      alert(`Loaded ${newItems.length} items from file`);
      e.target.value = "";
    } catch (error) {
      console.error("Error reading file:", error);
      alert("Error reading file. Please check format.");
      e.target.value = "";
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

  const toggleDhaba = (dhabaName) => {
    setOpenDhabas(prev => ({ ...prev, [dhabaName]: !prev[dhabaName] }));
  };

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
          <Collapsible key={dhabaName} open={openDhabas[dhabaName]} onOpenChange={() => toggleDhaba(dhabaName)}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                        <span className="text-white text-lg">🍽️</span>
                      </div>
                      <div className="text-left">
                        <CardTitle className="text-lg">{dhabaName}</CardTitle>
                        <p className="text-sm text-gray-600">{items.length} items available</p>
                      </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${openDhabas[dhabaName] ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
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
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))
      )}

      {/* Add Dhaba Dialog */}
      <Dialog open={showAddDhabaDialog} onOpenChange={setShowAddDhabaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Dhaba</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Dhaba Name</Label>
              <Input
                value={newDhabaName}
                onChange={(e) => setNewDhabaName(e.target.value)}
                placeholder="e.g., Sharma Dhaba, Raju Canteen"
                onKeyDown={(e) => e.key === 'Enter' && handleAddDhaba()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDhabaDialog(false)}>Cancel</Button>
            <Button onClick={handleAddDhaba} className="bg-emerald-600 hover:bg-emerald-700">
              Add Dhaba
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Menu Item" : "Add Menu Items"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Dhaba Name *</Label>
              <div className="flex gap-2">
                <Select 
                  value={formData.dhaba_name} 
                  onValueChange={(value) => {
                    if (value === "add_new") {
                      setShowAddDhabaDialog(true);
                    } else {
                      setFormData({ ...formData, dhaba_name: value });
                    }
                  }}
                  disabled={editingItem}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Dhaba" />
                  </SelectTrigger>
                  <SelectContent>
                    {dhabaList.map(dhaba => (
                      <SelectItem key={dhaba} value={dhaba}>{dhaba}</SelectItem>
                    ))}
                    <SelectItem value="add_new" className="text-emerald-600 font-medium">
                      <Plus className="w-3 h-3 inline mr-2" />
                      Add New Dhaba
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!editingItem && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium text-blue-900">Upload Items (Excel/CSV)</Label>
                  <label>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline" 
                      className="border-blue-300 text-blue-700 hover:bg-blue-100"
                      asChild
                    >
                      <span>
                        <Upload className="w-3 h-3 mr-2" />
                        Upload File
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleDialogFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-xs text-blue-700">
                  Format: Columns should be "Item Name" and "Price"
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Items *</Label>
                {!editingItem && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addItemRow}
                    className="h-7"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Item
                  </Button>
                )}
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {formData.items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-start p-2 border rounded-lg bg-gray-50">
                    <div className="flex-1">
                      <Input
                        placeholder="Item name (e.g., Chai, Aaloo Paratha)"
                        value={item.item_name}
                        onChange={(e) => updateItemRow(index, 'item_name', e.target.value)}
                        className="mb-2"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Price (₹)"
                        value={item.price}
                        onChange={(e) => updateItemRow(index, 'price', e.target.value)}
                      />
                    </div>
                    {!editingItem && formData.items.length > 1 && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeItemRow(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
              {editingItem ? "Update" : `Add ${formData.items.length} Item(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}