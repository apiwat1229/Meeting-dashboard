"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createIssueAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { ComboboxSelect } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/components/ui/toast";
import { Textarea } from "@/components/ui/textarea";

type ProjectOption = { id: number; name: string };
const severityOptions = [
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
];

export function AddIssueMenu({ projects }: { projects: ProjectOption[] }) {
  const [open, setOpen] = useState(false);

  async function handleCreate(formData: FormData) {
    const result = await createIssueAction(formData);
    if (result.ok) {
      toast.success(result.message);
      setOpen(false);
    } else {
      toast.error(result.message);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="icon-button" title={open ? "Close add issue form" : "Add issue"} aria-label={open ? "Close add issue form" : "Add issue"}>
        {open ? <X size={18} /> : <Plus size={18} />}
      </PopoverTrigger>
      <PopoverContent className="crud-popover issue-create-popover" align="end">
        <div className="crud-popover-heading">
          <h3 className="type-h3">New issue</h3>
          <Button type="button" variant="ghost" className="icon-button" onClick={() => setOpen(false)} aria-label="Close add issue form" title="Close"><X size={17} /></Button>
        </div>
        <form action={handleCreate} className="crud-form">
          <label className="field-label">Issue title<Input name="title" minLength={3} maxLength={180} required placeholder="Short issue title" /></label>
          <div className="field-pair">
            <label className="field-label">Project
              <ComboboxSelect name="projectId" options={[{ value: "none", label: "No linked project" }, ...projects.map((project) => ({ value: String(project.id), label: project.name }))]} defaultValue="none" placeholder="No linked project" searchPlaceholder="Search projects..." emptyMessage="No matching projects." />
            </label>
            <label className="field-label">Severity
              <ComboboxSelect name="severity" options={severityOptions} defaultValue="MEDIUM" />
            </label>
          </div>
          <label className="field-label">Detail<Textarea name="detail" maxLength={1000} rows={2} placeholder="What is happening?" /></label>
          <label className="field-label">Next step<Input name="nextStep" maxLength={500} placeholder="Owner / next action / due time" /></label>
          <Button type="submit"><Plus size={15} /> Save issue</Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
