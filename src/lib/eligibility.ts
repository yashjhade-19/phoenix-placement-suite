import type { EligibilityRule, Student } from "./types";

export type RuleKind = "number" | "text" | "skills" | "profile";
export type RuleCategory = "Academic" | "Academic background" | "Backlogs" | "Profile & skills";

export const RULE_FIELDS: Record<string, { label: string; kind: RuleKind; category: RuleCategory }> = {
  cgpa: { label: "CGPA", kind: "number", category: "Academic" },
  tenth_percentage: { label: "10th percentage", kind: "number", category: "Academic" },
  twelfth_percentage: { label: "12th percentage", kind: "number", category: "Academic" },
  diploma_percentage: { label: "Diploma percentage", kind: "number", category: "Academic" },
  active_backlogs: { label: "Active backlogs", kind: "number", category: "Backlogs" },
  total_backlogs: { label: "Total backlogs", kind: "number", category: "Backlogs" },
  graduation_year: { label: "Graduation year", kind: "number", category: "Academic background" },
  branch: { label: "Branch", kind: "text", category: "Academic background" },
  course: { label: "Course", kind: "text", category: "Academic background" },
  skills: { label: "Skill", kind: "skills", category: "Profile & skills" },
  resume_url: { label: "Resume", kind: "profile", category: "Profile & skills" },
  linkedin_url: { label: "LinkedIn profile", kind: "profile", category: "Profile & skills" },
  github_url: { label: "GitHub profile", kind: "profile", category: "Profile & skills" },
  portfolio_url: { label: "Portfolio", kind: "profile", category: "Profile & skills" },
  phone: { label: "Phone number", kind: "profile", category: "Profile & skills" },
};

export const RULE_CATEGORIES: RuleCategory[] = [
  "Academic",
  "Academic background",
  "Backlogs",
  "Profile & skills",
];

export const RULE_OPERATORS: Record<string, string> = {
  gte: "is at least",
  lte: "is at most",
  eq: "equals",
  neq: "is not",
  has: "includes",
  in: "is one of",
  present: "is provided",
};

export interface RuleCheck {
  rule: EligibilityRule;
  passed: boolean;
  requirement: string;
  actual: string;
}

export interface GroupResult {
  groupIndex: number;
  passed: boolean;
  checks: RuleCheck[];
}

export interface EligibilityResult {
  eligible: boolean;
  groups: GroupResult[];
  failures: RuleCheck[];
  hasRules: boolean;
}

function studentValue(student: Student, field: string): unknown {
  return (student as unknown as Record<string, unknown>)[field];
}

function describeActual(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not provided";
  if (Array.isArray(value)) return value.join(", ") || "None";
  return String(value);
}

export function describeRule(rule: EligibilityRule) {
  const meta = RULE_FIELDS[rule.field];
  const label = meta ? meta.label : rule.field;
  if (rule.operator === "present") return `${label} is provided`;
  if (rule.operator === "in") return `${label} is one of ${rule.value.split(",").map((v) => v.trim()).filter(Boolean).join(", ")}`;
  return `${label} ${RULE_OPERATORS[rule.operator] ?? rule.operator} ${rule.value}`;
}

function checkRule(student: Student, rule: EligibilityRule): RuleCheck {
  const value = studentValue(student, rule.field);
  const meta = RULE_FIELDS[rule.field];
  let passed = false;

  if (rule.operator === "present" || meta?.kind === "profile") {
    passed = Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined && String(value).trim() !== "";
    return { rule, passed, requirement: describeRule(rule), actual: passed ? "Provided" : "Not provided" };
  }
  if (rule.operator === "in") {
    const options = rule.value.split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
    const actual = value === null || value === undefined ? "" : String(value).trim().toLowerCase();
    passed = actual !== "" && options.includes(actual);
  } else if (meta?.kind === "skills") {
    const skills = Array.isArray(value) ? (value as string[]) : [];
    const target = rule.value.trim().toLowerCase();
    passed = skills.some((s) => s.trim().toLowerCase() === target);
  } else if (meta?.kind === "number") {
    const numeric = value === null || value === undefined || value === "" ? null : Number(value);
    const expected = Number(rule.value);
    if (numeric === null || Number.isNaN(numeric) || Number.isNaN(expected)) {
      passed = false;
    } else {
      switch (rule.operator) {
        case "gte":
          passed = numeric >= expected;
          break;
        case "lte":
          passed = numeric <= expected;
          break;
        case "eq":
          passed = numeric === expected;
          break;
        case "neq":
          passed = numeric !== expected;
          break;
        default:
          passed = false;
      }
    }
  } else {
    const actual = value === null || value === undefined ? "" : String(value).trim().toLowerCase();
    const expected = rule.value.trim().toLowerCase();
    passed = rule.operator === "neq" ? actual !== expected : actual === expected;
  }

  return {
    rule,
    passed,
    requirement: describeRule(rule),
    actual: describeActual(value),
  };
}

/**
 * Rules sharing a group_index are combined with OR; groups are combined with AND.
 */
export function evaluateEligibility(
  student: Student | null | undefined,
  rules: EligibilityRule[],
): EligibilityResult {
  if (!student) {
    return { eligible: false, groups: [], failures: [], hasRules: rules.length > 0 };
  }
  if (rules.length === 0) {
    return { eligible: true, groups: [], failures: [], hasRules: false };
  }

  const byGroup = new Map<number, EligibilityRule[]>();
  for (const rule of rules) {
    const list = byGroup.get(rule.group_index) ?? [];
    list.push(rule);
    byGroup.set(rule.group_index, list);
  }

  const groups: GroupResult[] = [];
  const failures: RuleCheck[] = [];

  for (const [groupIndex, groupRules] of [...byGroup.entries()].sort((a, b) => a[0] - b[0])) {
    const checks = groupRules.map((rule) => checkRule(student, rule));
    const passed = checks.some((c) => c.passed);
    groups.push({ groupIndex, passed, checks });
    if (!passed) failures.push(...checks);
  }

  return {
    eligible: groups.every((g) => g.passed),
    groups,
    failures,
    hasRules: true,
  };
}

export function isBatchEligible(student: Student | null | undefined, batches: number[]) {
  if (!batches || batches.length === 0) return true;
  if (!student?.graduation_year) return false;
  return batches.includes(student.graduation_year);
}

/** Combined drive eligibility (batch + rules) with human-readable reasons. */
export function driveEligibility(
  student: Student | null | undefined,
  rules: EligibilityRule[],
  batches: number[],
) {
  const result = evaluateEligibility(student, rules);
  const batchOk = isBatchEligible(student, batches);
  const reasons: string[] = [];
  if (!batchOk)
    reasons.push(`Graduation year ${batches.join("/")} required (yours: ${student?.graduation_year ?? "Not provided"})`);
  for (const group of result.groups) {
    if (group.passed) continue;
    reasons.push(
      group.checks.map((c) => `${c.requirement} (yours: ${c.actual})`).join(" or "),
    );
  }
  return { eligible: result.eligible && batchOk, reasons, result, batchOk };
}
