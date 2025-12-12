import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Download, FileSpreadsheet, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function BulkProductImport() {
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const exportToCSV = async () => {
    setIsExporting(true);
    try {
      const products = await base44.entities.Product.list();
      const categories = await base44.entities.Category.list();
      
      const categoryMap = {};
      categories.forEach(cat => categoryMap[cat.id] = cat.name);

      // CSV Headers
      const headers = [
        "Name", "Description", "Price", "Original Price", "Category", 
        "Stock Quantity", "Unit", "Delivery Charge", "Profit Margin",
        "Available From", "Available To", "Low Stock Threshold",
        "Mithali Stock", "Gavaskar Stock", "Virat Stock", "Tendulkar Stock"
      ];

      // CSV Rows
      const rows = products.map(p => [
        p.name,
        p.description || "",
        p.price,
        p.original_price || "",
        categoryMap[p.category_id] || "",
        p.stock_quantity || 0,
        p.unit || "piece",
        p.delivery_charge || 0,
        p.profit_margin || 0,
        p.available_from || "",
        p.available_to || "",
        p.low_stock_threshold || 10,
        p.hostel_stock?.Mithali || 0,
        p.hostel_stock?.Gavaskar || 0,
        p.hostel_stock?.Virat || 0,
        p.hostel_stock?.Tendulkar || 0
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
      ].join("\n");

      // Download file
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `products_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setImportResult({ success: true, message: "Products exported successfully!" });
    } catch (error) {
      console.error("Export error:", error);
      setImportResult({ success: false, message: "Failed to export products" });
    }
    setIsExporting(false);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const lines = text.split("\n").filter(line => line.trim());
      const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
      
      const categories = await base44.entities.Category.list();
      const categoryNameToId = {};
      categories.forEach(cat => categoryNameToId[cat.name] = cat.id);

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g).map(v => v.replace(/"/g, "").trim());
          
          const productData = {
            name: values[0],
            description: values[1],
            price: parseFloat(values[2]),
            original_price: values[3] ? parseFloat(values[3]) : null,
            category_id: categoryNameToId[values[4]] || categories[0]?.id,
            stock_quantity: parseInt(values[5]) || 0,
            unit: values[6] || "piece",
            delivery_charge: parseFloat(values[7]) || 0,
            profit_margin: parseFloat(values[8]) || 0,
            available_from: values[9] || null,
            available_to: values[10] || null,
            low_stock_threshold: parseInt(values[11]) || 10,
            hostel_stock: {
              Mithali: parseInt(values[12]) || 0,
              Gavaskar: parseInt(values[13]) || 0,
              Virat: parseInt(values[14]) || 0,
              Tendulkar: parseInt(values[15]) || 0
            },
            is_available: true
          };

          await base44.entities.Product.create(productData);
          successCount++;
        } catch (error) {
          errorCount++;
          errors.push(`Row ${i + 1}: ${error.message}`);
        }
      }

      setImportResult({
        success: errorCount === 0,
        message: `Import complete: ${successCount} successful, ${errorCount} failed`,
        errors: errors.slice(0, 5)
      });
    } catch (error) {
      console.error("Import error:", error);
      setImportResult({ success: false, message: "Failed to parse CSV file" });
    }
    setIsImporting(false);
    event.target.value = null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5" />
          Bulk Product Import/Export
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Export */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Export Products</h3>
            <p className="text-sm text-gray-600 mb-4">
              Download all products as CSV file
            </p>
            <Button
              onClick={exportToCSV}
              disabled={isExporting}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? "Exporting..." : "Export to CSV"}
            </Button>
          </div>

          {/* Import */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Import Products</h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload CSV file to add products in bulk
            </p>
            <label htmlFor="csv-upload">
              <Button
                type="button"
                disabled={isImporting}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                onClick={() => document.getElementById("csv-upload").click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                {isImporting ? "Importing..." : "Import from CSV"}
              </Button>
            </label>
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* CSV Format Info */}
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            <strong>CSV Format:</strong> Name, Description, Price, Original Price, Category, 
            Stock Quantity, Unit, Delivery Charge, Profit Margin, Available From, Available To,
            Low Stock Threshold, Mithali Stock, Gavaskar Stock, Virat Stock, Tendulkar Stock
          </AlertDescription>
        </Alert>

        {/* Import Result */}
        {importResult && (
          <Alert className={importResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
            <AlertDescription>
              <p className={importResult.success ? "text-green-800" : "text-red-800"}>
                {importResult.message}
              </p>
              {importResult.errors && importResult.errors.length > 0 && (
                <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                  {importResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}