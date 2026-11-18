import type { RepoRef } from "./github-path";
import { err, ok, type Result } from "./result";

/**
 * pattern は `owner` か `owner/repo`。大文字小文字は区別しない。
 * フィールドを増やしたら parseSettings / validateMappings / settings-panel も更新すること。
 */
export type EmailMapping = {
  readonly pattern: string;
  readonly email: string;
};

export type Settings = {
  readonly version: 1;
  readonly mappings: readonly EmailMapping[];
};

export const emptySettings: Settings = { version: 1, mappings: [] };

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isEmailMapping = (value: unknown): value is EmailMapping =>
  isRecord(value) &&
  typeof value["pattern"] === "string" &&
  typeof value["email"] === "string";

/** 保存済みの値 (unknown) を Settings として解釈する。壊れていたら理由を返す */
export const parseSettings = (raw: unknown): Result<Settings, string> => {
  if (raw === undefined) return ok(emptySettings);
  if (!isRecord(raw)) return err("settings is not an object");
  if (raw["version"] !== 1)
    return err(`unsupported settings version: ${String(raw["version"])}`);
  const mappings = raw["mappings"];
  if (!Array.isArray(mappings)) return err("mappings is not an array");
  const valid = mappings.filter(isEmailMapping);
  if (valid.length !== mappings.length)
    return err("mappings contains an invalid entry");
  return ok({
    version: 1,
    mappings: valid.map(({ pattern, email }) => ({ pattern, email })),
  });
};

export type MappingError =
  | {
      readonly kind: "invalid-pattern";
      readonly index: number;
      readonly pattern: string;
    }
  | {
      readonly kind: "invalid-email";
      readonly index: number;
      readonly email: string;
    }
  | {
      readonly kind: "duplicate-pattern";
      readonly index: number;
      readonly pattern: string;
    };

const PATTERN_RE = /^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)?$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+$/;

export const normalizePattern = (pattern: string): string =>
  pattern.trim().toLowerCase();

export const validateMappings = (
  mappings: readonly EmailMapping[],
): readonly MappingError[] =>
  mappings.flatMap((m, index): readonly MappingError[] => {
    const pattern = normalizePattern(m.pattern);
    const email = m.email.trim();
    const isDuplicate = mappings
      .slice(0, index)
      .some((prev) => normalizePattern(prev.pattern) === pattern);
    return [
      ...(PATTERN_RE.test(pattern)
        ? []
        : [
            {
              kind: "invalid-pattern",
              index,
              pattern: m.pattern,
            } satisfies MappingError,
          ]),
      ...(EMAIL_RE.test(email)
        ? []
        : [
            {
              kind: "invalid-email",
              index,
              email: m.email,
            } satisfies MappingError,
          ]),
      ...(isDuplicate
        ? [
            {
              kind: "duplicate-pattern",
              index,
              pattern: m.pattern,
            } satisfies MappingError,
          ]
        : []),
    ];
  });

export const formatMappingError = (e: MappingError): string => {
  switch (e.kind) {
    case "invalid-pattern":
      return `#${String(e.index + 1)}: "${e.pattern}" は owner か owner/repo の形式で指定してください`;
    case "invalid-email":
      return `#${String(e.index + 1)}: "${e.email}" はメールアドレスではありません`;
    case "duplicate-pattern":
      return `#${String(e.index + 1)}: "${e.pattern}" が重複しています`;
  }
};

/** 入力値を正規化した Settings を作る。不正なら全エラーを返す */
export const buildSettings = (
  mappings: readonly EmailMapping[],
): Result<Settings, readonly MappingError[]> => {
  const nonEmpty = mappings.filter(
    (m) => m.pattern.trim() !== "" || m.email.trim() !== "",
  );
  const errors = validateMappings(nonEmpty);
  return errors.length > 0
    ? err(errors)
    : ok({
        version: 1,
        mappings: nonEmpty.map((m) => ({
          pattern: normalizePattern(m.pattern),
          email: m.email.trim(),
        })),
      });
};

export type MatchedRule = {
  readonly pattern: string;
  readonly email: string;
};

/** `owner/repo` 指定を `owner` 指定より優先して解決する */
export const resolveRule = (
  mappings: readonly EmailMapping[],
  ref: RepoRef,
): MatchedRule | undefined => {
  const repoKey = `${ref.owner}/${ref.repo}`.toLowerCase();
  const ownerKey = ref.owner.toLowerCase();
  const find = (key: string): EmailMapping | undefined =>
    mappings.find((m) => normalizePattern(m.pattern) === key);
  const hit = find(repoKey) ?? find(ownerKey);
  return hit === undefined
    ? undefined
    : { pattern: hit.pattern, email: hit.email };
};
