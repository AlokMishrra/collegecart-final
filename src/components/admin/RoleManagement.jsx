import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Shield, Search } from "lucide-react";
import ConfirmDialog from "../shared/ConfirmDialog";

const AVAILABLE_PERMISSIONS = [
  { id: "view_summary", label: "View Dashboard" },
  { id: "products_view", label: "View Products" },
  { id: "manage_products", label: "Manage Products" },
  { id: "categories_view", label: "View Categories" },
  { id: "manage_categories", label: "Manage Categories" },
  { id: "manage_campaigns", label: "Manage Campaigns" },
  { id: "manage_reviews", label: "Manage Reviews" },
  { id: "manage_crm", label: "Manage CRM" },
  { id: "orders_view", label: "View Orders" },
  { id: "manage_orders", label: "Manage Orders" },
  { id: "delivery_view", label: "View Delivery" },
  { id: "manage_delivery", label: "Manage Delivery Personnel" },
  { id: "manage_settings", label: "Manage Settings" },
  { id: "manage_roles", label: "Manage Roles" },
  { id: "users_manage", label: "Manage Users" }
];

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, role: null });
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rolesData, usersData] = await Promise.all([
        base44.entities.Role.list(),
        base44.entities.User.list()
      ]);
      setRoles(rolesData);
      setUsers(usersData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleSaveRole = async () => {
    try {
      if (selectedRole) {
        await base44.entities.Role.update(selectedRole.id, formData);
      } else {
        await base44.entities.Role.create(formData);
      }
      await loadData();
      setIsFormOpen(false);
      setSelectedRole(null);
      setFormData({ name: "", description: "", permissions: [] });
    } catch (error) {
      console.error("Error saving role:", error);
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteDialog.role) return;
    try {
      await base44.entities.Role.delete(deleteDialog.role.id);
      await loadData();
    } catch (error) {
      console.error("Error deleting role:", error);
    }
    setDeleteDialog({ open: false, role: null });
  };

  const handleEditRole = (role) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      description: role.description || "",
      permissions: role.permissions || []
    });
    setIsFormOpen(true);
  };

  const handleAssignRole = async (userId, roleIds) => {
    try {
      await base44.entities.User.update(userId, { assigned_role_ids: roleIds });
      await loadData();
    } catch (error) {
      console.error("Error assigning role:", error);
    }
  };

  const toggleUserRole = (user, roleId) => {
    const currentRoles = user.assigned_role_ids || [];
    const newRoles = currentRoles.includes(roleId)
      ? currentRoles.filter(id => id !== roleId)
      : [...currentRoles, roleId];
    handleAssignRole(user.id, newRoles);
  };

  const togglePermission = (permissionId) => {
    const newPermissions = formData.permissions.includes(permissionId)
      ? formData.permissions.filter(p => p !== permissionId)
      : [...formData.permissions, permissionId];
    setFormData({ ...formData, permissions: newPermissions });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Role Management</h2>
          <p className="text-gray-600">Create and manage user roles with custom permissions</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setSelectedRole(null);
                setFormData({ name: "", description: "", permissions: [] });
              }}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedRole ? "Edit Role" : "Create New Role"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Role Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Store Incharge"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="Brief description of this role"
                />
              </div>
              <div>
                <Label className="mb-3 block">Permissions</Label>
                <div className="grid md:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-4 border rounded-lg">
                  {AVAILABLE_PERMISSIONS.map(permission => (
                    <div key={permission.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={permission.id}
                        checked={formData.permissions.includes(permission.id)}
                        onCheckedChange={() => togglePermission(permission.id)}
                      />
                      <label htmlFor={permission.id} className="text-sm cursor-pointer">
                        {permission.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveRole} className="bg-emerald-600 hover:bg-emerald-700">
                  {selectedRole ? "Update Role" : "Create Role"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Users Assigned</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map(role => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell>{role.description}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions?.slice(0, 3).map(p => (
                        <span key={p} className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded">
                          {AVAILABLE_PERMISSIONS.find(ap => ap.id === p)?.label || p}
                        </span>
                      ))}
                      {role.permissions?.length > 3 && (
                        <span className="text-xs text-gray-500">+{role.permissions.length - 3} more</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {users.filter(u => u.assigned_role_ids?.includes(role.id)).length} users
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleEditRole(role)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setDeleteDialog({ open: true, role })}
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
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Assign Roles to Staff
            </h3>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Assigned Roles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.filter(u => u.role !== 'admin').filter(u => {
                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase();
                return u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
              }).map(user => (
                <TableRow key={user.id}>
                  <TableCell>{user.full_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {roles.map(role => (
                        <div key={role.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`${user.id}-${role.id}`}
                            checked={user.assigned_role_ids?.includes(role.id) || false}
                            onCheckedChange={() => toggleUserRole(user, role.id)}
                          />
                          <label htmlFor={`${user.id}-${role.id}`} className="text-sm cursor-pointer">
                            {role.name}
                          </label>
                        </div>
                      ))}
                      {(!user.assigned_role_ids || user.assigned_role_ids.length === 0) && (
                        <span className="text-sm text-gray-500">No roles assigned</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title="Delete Role"
        description={`Are you sure you want to delete "${deleteDialog.role?.name}"? This will remove the role from all assigned users.`}
        onConfirm={handleDeleteRole}
        onCancel={() => setDeleteDialog({ open: false, role: null })}
      />
    </div>
  );
}