import type { Decision } from "../domain/decision";

export type StatusTone = "info" | "ok" | "danger";

export type StatusView = {
  readonly tone: StatusTone;
  readonly text: string;
};

export const describeDecision = (decision: Decision): StatusView => {
  switch (decision.kind) {
    case "not-a-pull-request":
      return {
        tone: "info",
        text: "Pull Request ページではないため何もしません",
      };
    case "no-rule":
      return {
        tone: "info",
        text: `${decision.ref.owner}/${decision.ref.repo} に対応する commit email の強制設定はありません`,
      };
    case "enforce":
      return {
        tone: "ok",
        text: `🔒 ${decision.rule.pattern} → ${decision.rule.email} を強制しています`,
      };
    case "unavailable":
      return {
        tone: "danger",
        text: `⛔ ${decision.rule.pattern} → ${decision.rule.email} はこのアカウントで選択できません (候補: ${decision.available.join(", ")})。マージをブロックしています`,
      };
  }
};

export const blockedMessage = (decision: Decision, selected: string): string =>
  decision.kind === "enforce"
    ? `⛔ commit email が ${selected} になっています。${decision.rule.email} 以外ではマージできません`
    : describeDecision(decision).text;
