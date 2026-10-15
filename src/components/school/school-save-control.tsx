"use client";

import { useViewer } from "@/components/school/use-viewer";
import { SaveButton } from "@/components/ui/save-button";

/** Save/Saved toggle whose state is resolved in the browser (see use-viewer.ts). */
export function SchoolSaveControl(props: {
  schoolId: string;
  locale: string;
  labelSave: string;
  labelSaved: string;
}) {
  const { saved } = useViewer(props.schoolId);
  return (
    <SaveButton
      key={saved ? "saved" : "unsaved"}
      schoolId={props.schoolId}
      saved={saved}
      locale={props.locale}
      labelSave={props.labelSave}
      labelSaved={props.labelSaved}
      span="w-fit shrink-0 px-4"
      variant="primary"
    />
  );
}
