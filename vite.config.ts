import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";

const INSTALL_URL =
  "https://github.com/LumaKernel/github-commit-email-config/raw/main/dist/github-commit-email-config.user.js";

export default defineConfig({
  plugins: [
    monkey({
      entry: "src/main.ts",
      userscript: {
        name: "GitHub Merge Commit Email Enforcer",
        namespace: "https://github.com/LumaKernel/github-commit-email-config",
        description:
          "Force the commit email selected in GitHub's merge dialog based on an owner/repo → email mapping",
        match: ["https://github.com/*"],
        // README のインストールリンクと同じ URL。dist はコミット対象なので変更後は必ず build してコミットする
        downloadURL: INSTALL_URL,
        updateURL: INSTALL_URL,
        "run-at": "document-idle",
      },
    }),
  ],
});
