/**
 * The minimum of `fetch` this package uses.
 *
 * Declared here rather than pulling in @types/node or the DOM lib: the package
 * has no dependencies on purpose (it gets copied into four different stacks),
 * and adding the DOM lib to a server-only module would type `window` as present
 * in exactly the environment where it must not be.
 */
declare function fetch(
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
): Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}>;
