import { useQueries, UseQueryResult } from "@tanstack/react-query";
import { songKeys } from "./keys";
import { signSongFilePath } from "@/lib/storage";

export function getSignedSongFileUrlQueryOptions(
  path: string,
  expiresIn: number,
  version?: string | number
) {
  const staleTime = Math.max(
    0,
    Math.min(expiresIn * 1000 - 30_000, 5 * 60 * 1000)
  );
  return {
    queryKey: songKeys.fileUrl(path, version),
    queryFn: async () => {
      const url = await signSongFilePath(path, expiresIn);
      return { url, expiresAt: Date.now() + expiresIn * 1000 } as const;
    },
    staleTime,
    // Retain for a day; version changes will invalidate
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  } as const;
}

export function useGetSignedSongFileUrls({
  paths,
  expiresIn = 3600,
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
