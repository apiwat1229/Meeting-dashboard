"use client";

import { useState } from "react";
import { ComboboxSelect } from "@/components/ui/combobox";

export type IssueActivityOption = {
  id: number;
  content: string;
  section: "YESTERDAY" | "TODAY" | "OTHER";
};

type RelatedSection = "none" | "YESTERDAY" | "TODAY" | "OTHER";

const sectionOptions = [
  { value: "none", label: "No linked section" },
  { value: "TODAY", label: "Today Other Activities" },
  { value: "YESTERDAY", label: "Yesterday Other Activities" },
  { value: "OTHER", label: "Other Topics" },
];

export function IssueActivityLinkFields({
  activities,
  defaultSection,
  defaultActivityId,
  onSelectionChange,
}: {
  activities: IssueActivityOption[];
  defaultSection?: "YESTERDAY" | "TODAY" | "OTHER" | null;
  defaultActivityId?: number | null;
  onSelectionChange?: (section: RelatedSection, activityId: string) => void;
}) {
  const [section, setSection] = useState<RelatedSection>(defaultSection ?? "none");
  const [activityId, setActivityId] = useState(defaultActivityId ? String(defaultActivityId) : "none");
  const activityOptions = [
    { value: "none", label: "Section only" },
    ...activities
      .filter((activity) => activity.section === section)
      .map((activity) => ({ value: String(activity.id), label: activity.content })),
  ];

  return (
    <>
      <label className="field-label">Related section
        <ComboboxSelect
          name="relatedSection"
          options={sectionOptions}
          value={section}
          onValueChange={(value) => {
            if (!value) return;
            const nextSection = value as RelatedSection;
            setSection(nextSection);
            setActivityId("none");
            onSelectionChange?.(nextSection, "none");
          }}
          placeholder="Choose a section"
          searchPlaceholder="Search sections..."
          emptyMessage="No matching sections."
        />
      </label>
      <label className="field-label">Related activity
        <ComboboxSelect
          name="relatedActivityId"
          options={activityOptions}
          value={activityId}
          onValueChange={(value) => {
            const nextActivityId = value ?? "none";
            setActivityId(nextActivityId);
            onSelectionChange?.(section, nextActivityId);
          }}
          placeholder={section === "none" ? "Choose a section first" : "Choose an activity or section only"}
          searchPlaceholder="Search activities..."
          emptyMessage="No activities in this section yet."
        />
      </label>
    </>
  );
}
