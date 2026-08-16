import type { Tables } from "@/integrations/supabase/types";

export type Organization = Tables<"organizations">;
export type Student = Tables<"students">;
export type Company = Tables<"companies">;
export type Drive = Tables<"drives">;
export type EligibilityRule = Tables<"eligibility_rules">;
export type FormField = Tables<"form_fields">;
export type RecruitmentStage = Tables<"recruitment_stages">;
export type Application = Tables<"applications">;
export type Announcement = Tables<"announcements">;

export type DriveStatus = Drive["status"];
export type ApplicationStatus = Application["status"];

export type DriveWithCompany = Drive & { company: Company | null };
export type ApplicationWithRelations = Application & {
  drive: (Drive & { company: Company | null }) | null;
  student: Student | null;
};
