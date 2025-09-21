import { createContext, useContext, useState, useEffect } from "react";
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
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    data,
    isLoading: settingsLoading,
    error: settingsError,
  } = useGetUserSettings(user?.id);

  useEffect(() => {
    if (!user) {
      setSettings(defaultSettings);
      setIsLoading(false);
      return;
    }
    if (settingsLoading !== isLoading) setIsLoading(settingsLoading);
    if ((settingsError as unknown as Error | null)?.message && !error) {
      setError((settingsError as unknown as Error).message);
    }
    if (data) {
      setSettings({
        oneTouchSongs: data.one_touch_songs || { songIds: [] },
      });
    }
  }, [user, data, settingsLoading, settingsError, isLoading, error]);

  const updateMutation = useUpdateUserSettings(user?.id || "");

  const updateSettings = async (
    newSettings: Partial<UserSettings>
  ): Promise<UserSettings> => {
    if (!user) throw new Error("User not authenticated");

    const updatedSettings = { ...settings, ...newSettings };

    await updateMutation.mutateAsync({
      oneTouchSongs: updatedSettings.oneTouchSongs,
    });

    setSettings(updatedSettings);
    return updatedSettings;
  };

  const updateOneTouchSongs = async (
    songIds: string[]
  ): Promise<UserSettings> => {
    // Limit to 3 songs
    const limitedSongIds = songIds.slice(0, 3);

    // Update local state immediately for better UX
    setSettings((prev) => ({
      ...prev,
      oneTouchSongs: {
        songIds: limitedSongIds,
      },
    }));

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
