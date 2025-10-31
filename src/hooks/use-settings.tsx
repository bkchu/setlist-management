import { createContext, useContext, useMemo } from "react";
import { useAuth } from "./use-auth";
// import { toast } from "sonner";
import { useGetUserSettings } from "@/api/settings/get";
import { useUpdateUserSettings } from "@/api/settings/put";

export interface UserSettings {
  oneTouchSongs: {
    songIds: string[];
  };
}

interface SettingsContextProps {
  settings: UserSettings;
  updateSettings: (settings: Partial<UserSettings>) => Promise<UserSettings>;
  updateOneTouchSongs: (songIds: string[]) => Promise<UserSettings>;
  isLoading: boolean;
  error: string | null;
}

const defaultSettings: UserSettings = {
  oneTouchSongs: {
    songIds: [],
  },
};

const SettingsContext = createContext<SettingsContextProps | undefined>(
  undefined
);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const {
    data,
    isLoading: settingsLoading,
    error: settingsError,
  } = useGetUserSettings(user?.id);

  const settings = useMemo<UserSettings>(() => {
    if (!user || !data) return defaultSettings;
    return {
      oneTouchSongs: data.one_touch_songs || { songIds: [] },
    };
  }, [user, data]);

  const isLoading = settingsLoading;
  const error = settingsError
    ? (settingsError as unknown as Error)?.message ?? "Failed to load settings"
    : null;

  const updateMutation = useUpdateUserSettings(user?.id || "");

  const updateSettings = async (
    newSettings: Partial<UserSettings>
  ): Promise<UserSettings> => {
    if (!user) throw new Error("User not authenticated");

    const updatedSettings = { ...settings, ...newSettings };

    await updateMutation.mutateAsync({
      oneTouchSongs: updatedSettings.oneTouchSongs,
    });

    return updatedSettings;
  };

  const updateOneTouchSongs = async (
    songIds: string[]
  ): Promise<UserSettings> => {
    // Limit to 3 songs
    const limitedSongIds = songIds.slice(0, 3);

    return updateSettings({
      oneTouchSongs: {
        songIds: limitedSongIds,
      },
    });
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        updateOneTouchSongs,
        isLoading,
        error,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
