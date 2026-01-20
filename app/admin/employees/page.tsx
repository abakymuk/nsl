"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  Loader2,
  Search,
  UserPlus,
  CheckCircle,
  XCircle,
  Shield,
  Pencil,
  Trash2,
  User,
  LayoutDashboard,
  FileText,
  Truck,
  Users,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { EMPLOYEE_MODULES, type EmployeeModule } from "@/lib/auth";

interface Employee {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  permissions: EmployeeModule[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: { email: string; full_name: string } | null;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
}

// Module display info
const MODULE_INFO: Record<EmployeeModule, { label: string; icon: typeof LayoutDashboard; description: string }> = {
  dashboard: {
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "View admin dashboard stats",
  },
  quotes: {
    label: "Quotes",
    icon: FileText,
    description: "Manage quote requests",
  },
  loads: {
    label: "Loads",
    icon: Truck,
    description: "Manage shipments and loads",
  },
  customers: {
    label: "Customers",
    icon: Users,
    description: "View and manage customers",
  },
  analytics: {
    label: "Analytics",
    icon: BarChart3,
    description: "View business analytics",
  },
  sync: {
    label: "PortPro Sync",
    icon: RefreshCw,
    description: "Manage PortPro integration",
  },
};

export default function EmployeesPage() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form state
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<EmployeeModule[]>([]);
  const [saving, setSaving] = useState(false);

  const loadEmployees = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/employees");
      if (!res.ok) {
        setError("Failed to load employees");
        return;
      }
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch {
      setError("Failed to load employees");
    }
  }, []);

  const loadAvailableUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) return;
      const data = await res.json();

      // Filter out users who are already employees or super admins
      const employeeUserIds = new Set(employees.map((e) => e.user_id));
      const available = (data.users || []).filter(
        (user: UserProfile) =>
          user.role !== "super_admin" && !employeeUserIds.has(user.id)
      );
      setAvailableUsers(available);
    } catch {
      // Silently fail
    }
  }, [employees]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await loadEmployees();
      setLoading(false);
    };
    load();
  }, [loadEmployees]);

  useEffect(() => {
    if (!loading) {
      loadAvailableUsers();
    }
  }, [loading, loadAvailableUsers]);

  const openCreateDialog = () => {
    setEditingEmployee(null);
    setSelectedUserId("");
    setSelectedPermissions(["dashboard"]); // Default to dashboard
    setDialogOpen(true);
  };

  const openEditDialog = (employee: Employee) => {
    setEditingEmployee(employee);
    setSelectedUserId(employee.user_id);
    setSelectedPermissions([...employee.permissions]);
    setDialogOpen(true);
  };

  const togglePermission = (module: EmployeeModule) => {
    setSelectedPermissions((prev) => {
      if (prev.includes(module)) {
        // Don't allow removing dashboard
        if (module === "dashboard") return prev;
        return prev.filter((p) => p !== module);
      } else {
        return [...prev, module];
      }
    });
  };

  const saveEmployee = async () => {
    setSaving(true);
    setError(null);

    try {
      if (editingEmployee) {
        // Update existing employee
        const res = await fetch("/api/admin/employees", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId: editingEmployee.id,
            permissions: selectedPermissions,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to update employee");
          return;
        }

        setSuccess("Employee permissions updated");
      } else {
        // Create new employee
        if (!selectedUserId) {
          setError("Please select a user");
          return;
        }

        const res = await fetch("/api/admin/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: selectedUserId,
            permissions: selectedPermissions,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to create employee");
          return;
        }

        setSuccess("Employee created successfully");
      }

      setDialogOpen(false);
      await loadEmployees();
    } catch {
      setError("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const toggleEmployeeActive = async (employee: Employee) => {
    setProcessingId(employee.id);
    setError(null);

    try {
      const res = await fetch("/api/admin/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employee.id,
          isActive: !employee.is_active,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update employee");
        return;
      }

      setSuccess(
        employee.is_active
          ? "Employee deactivated"
          : "Employee activated"
      );
      await loadEmployees();
    } catch {
      setError("Failed to update employee");
    } finally {
      setProcessingId(null);
    }
  };

  const deleteEmployee = async (employeeId: string) => {
    if (!confirm("Are you sure you want to remove this employee?")) {
      return;
    }

    setProcessingId(employeeId);
    setError(null);

    try {
      const res = await fetch(`/api/admin/employees?id=${employeeId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete employee");
        return;
      }

      setSuccess("Employee removed");
      await loadEmployees();
    } catch {
      setError("Failed to delete employee");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employee Management</h1>
          <p className="text-muted-foreground">
            Manage employees with limited admin access
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? "Edit Employee Permissions" : "Add New Employee"}
              </DialogTitle>
              <DialogDescription>
                {editingEmployee
                  ? "Update which modules this employee can access."
                  : "Select a user and assign module permissions."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* User Selection (only for new employees) */}
              {!editingEmployee && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select User</label>
                  {availableUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No available users. All users are either super admins or
                      already employees.
                    </p>
                  ) : (
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select a user...</option>
                      {availableUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.full_name || user.email} ({user.email})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Current User (when editing) */}
              {editingEmployee && (
                <div className="p-3 rounded-lg border bg-muted/50">
                  <p className="font-medium">
                    {editingEmployee.full_name || editingEmployee.email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {editingEmployee.email}
                  </p>
                </div>
              )}

              {/* Permissions */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Module Permissions</label>
                <div className="space-y-2">
                  {EMPLOYEE_MODULES.map((module) => {
                    const info = MODULE_INFO[module];
                    const Icon = info.icon;
                    const isChecked = selectedPermissions.includes(module);
                    const isDisabled = module === "dashboard"; // Dashboard always required

                    return (
                      <label
                        key={module}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isChecked
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        } ${isDisabled ? "opacity-70" : ""}`}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => togglePermission(module)}
                          disabled={isDisabled}
                        />
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{info.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {info.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={saveEmployee}
                disabled={saving || (!editingEmployee && !selectedUserId)}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingEmployee ? (
                  "Save Changes"
                ) : (
                  "Add Employee"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-lg">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-700"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 text-sm text-green-600 bg-green-50 rounded-lg">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {success}
          <button
            onClick={() => setSuccess(null)}
            className="ml-auto text-green-600 hover:text-green-700"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Employees List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Employees ({employees.length})
          </CardTitle>
          <CardDescription>
            Users with limited admin access to specific modules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredEmployees.length === 0 ? (
              <div className="text-center py-12">
                <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? "No employees found matching your search"
                    : "No employees yet. Add your first employee to get started."}
                </p>
              </div>
            ) : (
              filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    !employee.is_active ? "opacity-60 bg-muted/30" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        employee.is_active ? "bg-primary/10" : "bg-muted"
                      }`}
                    >
                      <User
                        className={`h-5 w-5 ${
                          employee.is_active
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`}
                      />
                    </div>
                    <div>
                      <p className="font-medium">
                        {employee.full_name || employee.email}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {employee.email}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {employee.permissions.map((perm) => (
                          <span
                            key={perm}
                            className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                          >
                            {MODULE_INFO[perm]?.label || perm}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!employee.is_active && (
                      <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                        Inactive
                      </span>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(employee)}
                      disabled={processingId === employee.id}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleEmployeeActive(employee)}
                      disabled={processingId === employee.id}
                      className={
                        employee.is_active
                          ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          : "text-green-600 hover:text-green-700 hover:bg-green-50"
                      }
                    >
                      {processingId === employee.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : employee.is_active ? (
                        "Deactivate"
                      ) : (
                        "Activate"
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteEmployee(employee.id)}
                      disabled={processingId === employee.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {processingId === employee.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
