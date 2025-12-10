import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, Loader2 } from "lucide-react";
import { UploadFile } from "@/integrations/Core";

export default function ImageUploader({ onImageSelect, currentImage, placeholder }) {
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState(currentImage || "");
  const [previewImage, setPreviewImage] = useState(currentImage || "");

  React.useEffect(() => {
    setUrlInput(currentImage || "");
    setPreviewImage(currentImage || "");
  }, [currentImage]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      onImageSelect(file_url);
      setUrlInput(file_url);
      setPreviewImage(file_url);
    } catch (error) {
      console.error("Error uploading file:", error);
    }
    setIsUploading(false);
  };

  const handleUrlSubmit = () => {
    const trimmedUrl = urlInput.trim();
    if (trimmedUrl) {
      onImageSelect(trimmedUrl);
      setPreviewImage(trimmedUrl);
    }
  };

  const handleUrlKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleUrlSubmit();
    }
  };

  return (
    <div className="space-y-4">
      <Label>Image</Label>
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Upload File</TabsTrigger>
          <TabsTrigger value="url">Image URL</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload" className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="flex-1"
            />
            {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
          </div>
        </TabsContent>
        
        <TabsContent value="url" className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter image URL or search Google Images"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyPress={handleUrlKeyPress}
              className="flex-1"
            />
            <Button onClick={handleUrlSubmit} variant="outline" type="button">
              <Link className="w-4 h-4 mr-1" />
              Apply
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Paste image URL and click "Apply" or press Enter
          </p>
        </TabsContent>
      </Tabs>
      
      {previewImage && (
        <div className="mt-4">
          <Label className="text-sm text-gray-600">Preview:</Label>
          <div className="mt-2 w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-50">
            <img
              src={previewImage}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = placeholder || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=150";
              }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1 break-all">{previewImage}</p>
        </div>
      )}
    </div>
  );
}