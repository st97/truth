import { TodoistApiClient } from "@/api";
import { ObsidianFetcher } from "@/api/fetcher";
import { t } from "@/i18n";

export namespace TokenValidation {
  export type Result =
    | { kind: "none" }
    | { kind: "error"; message: string }
    | { kind: "in-progress" }
    | { kind: "success" };

  export let validate = async (token: string, tester: TokenTester): Promise<Result> => {
    let i18n = t().tokenValidation;

    if (token.length === 0) {
      return { kind: "error", message: i18n.emptyTokenError };
    }

    let isValid = await tester(token);

    if (!isValid) {
      return {
        kind: "error",
        message: i18n.invalidTokenError,
      };
    }

    return { kind: "success" };
  };

  export type TokenTester = (token: string) => Promise<boolean>;

  export let DefaultTester: TokenTester = async (token: string): Promise<boolean> => {
    let api = new TodoistApiClient(token, new ObsidianFetcher());

    try {
      await api.getProjects();
      return true;
    } catch (e) {
      return false;
    }
  };
}
