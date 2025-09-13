export const setlistKeys = {
  all: ["setlists"] as const,
  lists: () => [...setlistKeys.all, "list"] as const,
  list: (filters: unknown) => [...setlistKeys.lists(), { filters }] as const,
  details: () => [...setlistKeys.all, "detail"] as const,
  detail: (id: string) => [...setlistKeys.details(), id] as const,
  songs: (id: string) => [...setlistKeys.detail(id), "songs"] as const,
};
