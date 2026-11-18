import type { RepoRef } from "./github-path";
import { resolveRule, type EmailMapping, type MatchedRule } from "./settings";

/** Decision を増やしたら allowsMerge と ui/status.ts の switch も更新すること (exhaustive check で検出される) */
export type Decision =
  | { readonly kind: "not-a-pull-request" }
  | { readonly kind: "no-rule"; readonly ref: RepoRef }
  | { readonly kind: "enforce"; readonly rule: MatchedRule }
  | {
      readonly kind: "unavailable";
      readonly rule: MatchedRule;
      readonly available: readonly string[];
    };

export const decide = (
  ref: RepoRef | undefined,
  mappings: readonly EmailMapping[],
  available: readonly string[],
): Decision => {
  if (ref === undefined) return { kind: "not-a-pull-request" };
  const rule = resolveRule(mappings, ref);
  if (rule === undefined) return { kind: "no-rule", ref };
  const wanted = rule.email.toLowerCase();
  const exact = available.find((a) => a.toLowerCase() === wanted);
  return exact === undefined
    ? { kind: "unavailable", rule, available }
    : { kind: "enforce", rule: { ...rule, email: exact } };
};

/** マージ確定を許可してよいか */
export const allowsMerge = (decision: Decision, selected: string): boolean => {
  switch (decision.kind) {
    case "not-a-pull-request":
    case "no-rule":
      return true;
    case "enforce":
      return selected === decision.rule.email;
    case "unavailable":
      return false;
  }
};
