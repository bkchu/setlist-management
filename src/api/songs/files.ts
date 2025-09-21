import { useQueries, UseQueryResult } from "@tanstack/react-query";
import { songKeys } from "./keys";
import { signSongFilePath } from "@/lib/storage";

export function getSignedSongFileUrlQueryOptions(
  path: string,
  expiresIn: number,
  version?: string | number
) {
  // Keep URLs fresh for most of their lifetime, but refresh before expiry
  const staleTime = Math.max(
    0,
    expiresIn * 1000 - 10 * 60 * 1000 // Refresh 10 minutes before expiry
  );
  return {
    queryKey: songKeys.fileUrl(path, version),
    queryFn: async () => {
      const url = await signSongFilePath(path, expiresIn);
      return { url, expiresAt: Date.now() + expiresIn * 1000 } as const;
    },
    staleTime,
    // Retain for longer than expiry to allow background refresh
    gcTime: (expiresIn + 60 * 60) * 1000, // expiry + 1 hour
    refetchOnWindowFocus: false,
    retry: 2, // More retries for network issues
  } as const;
}

export function useGetSignedSongFileUrls({
  paths,
  expiresIn = 8 * 60 * 60, // 8 hours - match storage.ts default
  versions,
}: {
  paths?: string[];
  expiresIn?: number;
  versions?: (string | number | undefined)[];
}) {
  const queries = (paths ?? []).map((path, i) =>
    getSignedSongFileUrlQueryOptions(path, expiresIn, versions?.[i])
  );
  const results = useQueries({ queries }) as UseQueryResult<
    { url: string; expiresAt: number },
    unknown
  >[];

  const urlsByPath: Record<string, string | undefined> = {};
  (paths ?? []).forEach((p, i) => {
    urlsByPath[p] = results[i]?.data?.url;
  });

  const isAnyLoading = results.some((r) => r.isLoading);

  return { urlsByPath, results, isAnyLoading } as const;
}
