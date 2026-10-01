"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { toggleActivityAction } from "@/app/actions";
import { ConfirmActionDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

export function ActivityCompletionToggle({ activityId, content, completed }: { activityId: number; content: string; completed: boolean }) {
  const [open, setOpen] = useState(false);

  async function confirm() {
    const formData = new FormData();
    formData.set("id", String(activityId));
    formData.set("completed", String(!completed));
    const result = await toggleActivityAction(formData);
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
  }

  return (
    <>
      <Button variant="ghost" className="activity-toggle-button" type="button" aria-label={completed ? `Mark ${content} incomplete` : `Mark ${content} complete`} onClick={() => setOpen(true)}>
        {completed ? <Check size={15} /> : <span className="activity-bullet" />}
      </Button>
      <ConfirmActionDialog
        open={open}
        onOpenChange={setOpen}
        title={completed ? "Move this activity back to in progress?" : "Mark this activity done?"}
        description={completed ? `Reopen “${content}”?` : `Mark “${content}” as done?`}
        actionLabel={completed ? "Reopen activity" : "Mark done"}
        onConfirm={() => { void confirm(); }}
      />
    </>
  );
}
