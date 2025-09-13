export const organizationKeys = {
  all: ["orgs"] as const,
  list: (userId: string | undefined) => ["orgs", userId] as const,
};

