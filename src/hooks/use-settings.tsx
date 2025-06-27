import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./use-auth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

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

  useEffect(() => {
    if (user) {
      loadSettings();
    } else {
      setSettings(defaultSettings);
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "no rows returned" error
        throw error;
      }

      if (data) {
        setSettings({
          oneTouchSongs: data.one_touch_songs || { songIds: [] },
        });
      } else {
        // Create default settings if none exist
        await supabase.from("user_settings").insert({
          user_id: user.id,
          one_touch_songs: defaultSettings.oneTouchSongs,
        });

        setSettings(defaultSettings);
      }
    } catch (err) {
      setError("Failed to load settings");
      toast.error("Error", {
        description: "Failed to load settings",
      });
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (
    newSettings: Partial<UserSettings>
  ): Promise<UserSettings> => {
    if (!user) throw new Error("User not authenticated");

    setIsLoading(true);
    setError(null);

    try {
      const updatedSettings = { ...settings, ...newSettings };

      // First check if a record exists
      const { data: existingData } = await supabase
        .from("user_settings")
        .select("id")
        .eq("user_id", user.id)
        .single();

      let error;

      if (existingData) {
        // Update existing record
        const result = await supabase
          .from("user_settings")
          .update({
            one_touch_songs: updatedSettings.oneTouchSongs,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);

        error = result.error;
      } else {
        // Insert new record
        const result = await supabase.from("user_settings").insert({
          user_id: user.id,
          one_touch_songs: updatedSettings.oneTouchSongs,
          updated_at: new Date().toISOString(),
        });

        error = result.error;
      }

      if (error) throw error;

      setSettings(updatedSettings);
      return updatedSettings;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update settings"
      );
      throw err;
    } finally {
      setIsLoading(false);
    }
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
