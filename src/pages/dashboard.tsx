import { AppLayout } from "@/components/layout/app-layout";
import { useSongs } from "@/hooks/use-songs";
import {
  CalendarIcon,
  ListMusicIcon,
  MusicIcon,
  AlertTriangleIcon,
  Plus,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useGetSetlistsByOrganization } from "@/api/setlists/list";
import { Button } from "@/components/ui/button";
import { SetlistCard } from "@/components/dashboard/setlist-card";
import { useState } from "react";
import { SetlistForm } from "@/components/setlists/setlist-form";
import { SongForm } from "@/components/songs/song-form";
import { toast } from "sonner";
import { Setlist, Song } from "@/types";
import { useCreateSetlist } from "@/api/setlists/post";
import { useCreateSong } from "@/api/songs/post";

export default function Dashboard() {
  const { songs } = useSongs();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: setlists = [] } = useGetSetlistsByOrganization(
    user?.organizationId
  );
  const createSetlist = useCreateSetlist();
  const createSong = useCreateSong();
  const [showSetlistForm, setShowSetlistForm] = useState(false);
  const [showSongForm, setShowSongForm] = useState(false);

  // Find next setlist - closest to today
  const sortedSetlists = [...setlists].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Helper to normalize a date to midnight (local time)
  function normalizeToDateOnly(date: Date | string) {
    const d = typeof date === "string" ? new Date(date) : date;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  const today = normalizeToDateOnly(new Date());
  const upcomingSetlists = sortedSetlists.filter(
    (setlist) => normalizeToDateOnly(setlist.date) >= today
  );

  // Get next 3-5 upcoming setlists for display
  const displayedUpcomingSetlists = upcomingSetlists.slice(0, 5);

  // Helper function to find setlists needing attention
  // Setlists happening this week that are empty or incomplete (< 3 songs)
  function getSetlistsNeedingAttention() {
    const oneWeekFromToday = new Date(today);
    oneWeekFromToday.setDate(oneWeekFromToday.getDate() + 7);

    return setlists.filter((setlist) => {
      const setlistDate = normalizeToDateOnly(setlist.date);
      const isThisWeek =
        setlistDate >= today &&
        setlistDate <= normalizeToDateOnly(oneWeekFromToday);
      const songCount = setlist.songs.length;
      const needsAttention = isThisWeek && (songCount === 0 || songCount < 3);
      return needsAttention;
    });
  }

  const setlistsNeedingAttention = getSetlistsNeedingAttention();

  const handleCreateSetlist = async (setlistData: Partial<Setlist>) => {
    try {
      if (!user?.organizationId) throw new Error("No organization selected");
      const created = await createSetlist.mutateAsync({
        name: setlistData.name!,
        date: setlistData.date!,
        organizationId: user.organizationId,
      });
      setShowSetlistForm(false);
      toast.success("Setlist created", {
        description: `"${setlistData.name}" has been created`,
      });
      navigate(`/setlist/${created.id}`);
    } catch (error) {
      toast.error("Error", {
        description:
          error instanceof Error ? error.message : "Failed to create setlist",
      });
    }
  };

  const handleCreateSong = async (songData: Partial<Song>) => {
    try {
      if (!user?.organizationId) throw new Error("No organization selected");
      await createSong.mutateAsync({
        title: songData.title!,
        artist: songData.artist,
        notes: songData.notes,
        files: songData.files,
        keyedFiles: songData.keyedFiles,
        organizationId: user.organizationId,
      });
      setShowSongForm(false);
      toast.success("Song added", {
        description: `"${songData.title}" has been added to your library`,
      });
    } catch (error) {
      toast.error("Error", {
        description:
          error instanceof Error ? error.message : "Failed to add song",
      });
    }
  };

  return (
    <AppLayout title="Dashboard">
      {/* Quick Actions Bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button
          onClick={() => setShowSetlistForm(true)}
          size="default"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Setlist
        </Button>
        <Button
          onClick={() => setShowSongForm(true)}
          variant="outline"
          size="default"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Song
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="md:col-span-2 lg:col-span-4">
          <SetlistCard
            title="Upcoming Setlists"
            icon={CalendarIcon}
            setlists={displayedUpcomingSetlists}
            emptyMessage="No upcoming setlists"
            emptyActionLabel="Create Setlist"
            onEmptyAction={() => setShowSetlistForm(true)}
            showViewAll={
              upcomingSetlists.length > displayedUpcomingSetlists.length
            }
            maxItems={5}
          />
        </div>
      </div>

      {/* Setlists Needing Attention - only show when there are issues */}
      {setlistsNeedingAttention.length > 0 && (
        <div className="mt-4">
          <SetlistCard
            title="Setlists Needing Attention"
            icon={AlertTriangleIcon}
            setlists={setlistsNeedingAttention}
            showAttentionStyle={true}
            maxItems={setlistsNeedingAttention.length}
          />
        </div>
      )}

      {/* Subtle stats footer */}
      <div className="mt-6 pt-4 border-t flex items-center justify-center gap-6 text-sm text-muted-foreground">
        <Link
          to="/setlists"
          className="flex items-center gap-2 hover:text-foreground transition"
          aria-label="Go to Setlists"
        >
          <ListMusicIcon className="h-4 w-4" />
          <span className="font-medium">{setlists.length}</span>
          <span>setlists</span>
        </Link>
        <Link
          to="/songs"
          className="flex items-center gap-2 hover:text-foreground transition"
          aria-label="Go to Songs"
        >
          <MusicIcon className="h-4 w-4" />
          <span className="font-medium">{songs.length}</span>
          <span>songs</span>
        </Link>
      </div>

      {/* Setlist Form Dialog */}
      <SetlistForm
        open={showSetlistForm}
        onOpenChange={setShowSetlistForm}
        onSubmit={handleCreateSetlist}
      />

      {/* Song Form Dialog */}
      <SongForm
        open={showSongForm}
        onOpenChange={setShowSongForm}
        onSubmit={handleCreateSong}
      />
    </AppLayout>
  );
}
