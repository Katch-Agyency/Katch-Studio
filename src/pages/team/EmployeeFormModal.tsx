import React, { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import type { EmployeeInput, EmployeeStatus, Profile } from "@/types";
import { EMPLOYEE_ROLES, EMPLOYEE_STATUSES } from "@/types";
import { Button } from "@/components/ui/ui";
import { Field, Segmented, Select, TextInput } from "@/components/ui/Fields";
import { Modal } from "@/components/ui/Modal";
import { EMPLOYEE_STATUS_META } from "@/data/status";

/* ============================================================
   Employee form — one modal for Add Employee and Edit.
   Fields exactly like the profile record: Full Name, Role,
   Status, Phone (optional), Email (optional). New employees
   default to Active.
   ============================================================ */

const BLANK = {
  name: "",
  role: "Sales",
  status: "active" as EmployeeStatus,
  phone: "",
  email: "",
};

export function EmployeeFormModal({
  open,
  onClose,
  employee,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  /** When present → Edit mode (updates this exact record). */
  employee?: Profile | null;
  onSubmit: (input: EmployeeInput) => { ok: boolean; error?: string };
}) {
  const [form, setForm] = useState<EmployeeInput>(BLANK);
  const [error, setError] = useState("");
  const editing = Boolean(employee);

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm(
      employee
        ? {
            name: employee.name,
            role: employee.role,
            status: employee.status,
            phone: employee.phone,
            email: employee.email,
          }
        : { ...BLANK }
    );
  }, [open, employee]);

  const set = <K extends keyof EmployeeInput>(key: K, value: EmployeeInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = () => {
    if (!form.name.trim()) {
      setError("Full name is required.");
      return;
    }
    const result = onSubmit({ ...form, name: form.name.trim(), phone: form.phone?.trim() ?? "", email: form.email?.trim() ?? "" });
    if (!result.ok) {
      setError(result.error ?? "Could not save the employee.");
      return;
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit Employee" : "Add Employee"}
      description={
        editing
          ? "Update the existing employee record — changes apply everywhere instantly."
          : "New team members become available in Lead Assignment, Auto Assignment and Your Tasks immediately."
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit}>
            {!editing && <UserPlus className="h-4 w-4" />}
            {editing ? "Save Changes" : "Add Employee"}
          </Button>
        </>
      }
    >
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label="Full Name *" hint="Shown in assignment lists and Your Tasks.">
          <TextInput
            id="emp-name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Sara Khaled"
            autoFocus
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Role" hint="“Admin” grants management controls.">
            <Select
              id="emp-role"
              value={EMPLOYEE_ROLES.includes(form.role as (typeof EMPLOYEE_ROLES)[number]) ? form.role : "__custom"}
              onChange={(e) => {
                const v = e.target.value;
                if (v !== "__custom") set("role", v);
              }}
            >
              {EMPLOYEE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
              {/* Keep free-text roles (e.g. from older data) visible */}
              {!EMPLOYEE_ROLES.includes(form.role as (typeof EMPLOYEE_ROLES)[number]) && form.role && (
                <option value="__custom">{form.role} (current)</option>
              )}
            </Select>
          </Field>

          <Field label="Status">
            <div className="pt-1">
              <Segmented<EmployeeStatus>
                ariaLabel="Employee status"
                value={form.status}
                onChange={(v) => set("status", v)}
                options={EMPLOYEE_STATUSES.map((s) => ({ value: s, label: EMPLOYEE_STATUS_META[s].label }))}
              />
            </div>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone (optional)">
            <TextInput
              id="emp-phone"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+20 1XX XXX XXXX"
            />
          </Field>
          <Field label="Email (optional)">
            <TextInput
              id="emp-email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="name@company.com"
            />
          </Field>
        </div>

        {editing && employee?.status === "active" && form.status === "inactive" && (
          <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-600 dark:text-amber-300">
            Deactivating keeps every lead and all activity history — the employee is only removed from new
            assignment options and Auto Assignment.
          </p>
        )}

        {error && (
          <p role="alert" className="rounded-lg border border-danger/30 bg-danger-muted px-3 py-2 text-xs text-danger">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
