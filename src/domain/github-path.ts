export type RepoRef = {
  readonly owner: string;
  readonly repo: string;
};

/** `/owner/repo/pull/123` 以下のパスから owner/repo を取り出す */
export const parsePullRequestPath = (pathname: string): RepoRef | undefined => {
  const match = /^\/([^/]+)\/([^/]+)\/pull\/\d+(?:\/|$)/.exec(pathname);
  const owner = match?.[1];
  const repo = match?.[2];
  return owner !== undefined && repo !== undefined
    ? { owner, repo }
    : undefined;
};
