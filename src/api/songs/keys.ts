export const songKeys = {
  all: ["songs"] as const,
  lists: () => ["songs", "list"] as const,
  list: (filters: unknown) => ["songs", "list", { filters }] as const,
  details: () => ["songs", "detail"] as const,
  detail: (id: string) => ["songs", "detail", id] as const,
  fileUrl: (path: string, version?: string | number) =>
    ["songs", "fileUrl", path, version] as const,
};
