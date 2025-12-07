import { AppLayout } from "@/components/layout/app-layout";
import { useSongs } from "@/hooks/use-songs";
import {
  CalendarIcon,
  ListMusicIcon,
  MusicIcon,
  Plus,
  ClockIcon,
  Music2Icon,
  ChevronRightIcon,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
  const nextSetlist = upcomingSetlists[0];

  // Find empty setlists happening this week
  function getEmptyUpcomingSetlists() {
    const oneWeekFromToday = new Date(today);
    oneWeekFromToday.setDate(oneWeekFromToday.getDate() + 7);

    return setlists.filter((setlist) => {
      const setlistDate = normalizeToDateOnly(setlist.date);
      const isThisWeek =
        setlistDate >= today &&
        setlistDate <= normalizeToDateOnly(oneWeekFromToday);
      return isThisWeek && setlist.songs.length === 0;
    });
  }

  const emptyUpcomingSetlists = getEmptyUpcomingSetlists();

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

  // Stats for the hero section (removed Next Up - now shown as featured card)
  const stats = [
    {
      label: "Active Songs",
      value: songs.length,
      subtext: "Total in library",
      icon: Music2Icon,
      link: "/songs",
      color: "text-blue-400",
    },
    {
      label: "Setlists",
      value: setlists.length,
      subtext: "All time",
      icon: ListMusicIcon,
      link: "/setlists",
      color: "text-purple-400",
    },
    {
      label: "Empty This Week",
      value: emptyUpcomingSetlists.length,
      subtext: "Setlists without songs",
      icon: ListMusicIcon,
      color: "text-muted-foreground",
    },
  ];

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-8">
        {/* Hero Section with Glassmorphism */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-card/50 to-background/50 p-6 shadow-glass backdrop-blur-xl md:p-8">
          {/* Ambient Background Glow */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                Welcome back, {user?.name?.split(" ")[0] || "User"}
              </h2>
              <p className="text-muted-foreground">
                Here's what's happening with your worship team.
              </p>
            </div>

            {/* Quick Actions Toolbar */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => setShowSetlistForm(true)}
                size="lg"
                className="gap-2 shadow-glow-sm transition-all hover:scale-105"
              >
                <Plus className="h-5 w-5" />
                Create Setlist
              </Button>
              <Button
                onClick={() => setShowSongForm(true)}
                variant="secondary"
                size="lg"
                className="gap-2 transition-all hover:bg-white/10"
              >
                <MusicIcon className="h-5 w-5" />
                Add Song
              </Button>
            </div>
          </div>

          {/* Next Up Featured Card */}
          {nextSetlist ? (
            <Link
              to={`/setlist/${nextSetlist.id}`}
              className="group mt-8 flex items-center gap-4 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 transition-all duration-300 hover:border-primary/40 hover:from-primary/15 hover:via-primary/10 sm:p-5"
            >
              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Next Up
                  </span>
                  <Badge
                    variant="secondary"
                    className="bg-white/10 px-1.5 py-0 text-[10px] font-medium"
                  >
                    {nextSetlist.songs.length}{" "}
                    {nextSetlist.songs.length === 1 ? "song" : "songs"}
                  </Badge>
                </div>
                <h3 className="mt-1 truncate text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                  {nextSetlist.name}
                </h3>
                <div className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  <span>
                    {format(new Date(nextSetlist.date), "EEEE, MMM d")}
                  </span>
                </div>
              </div>

              {/* Action Arrow */}
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/5 transition-all duration-300 group-hover:bg-primary/20">
                <ChevronRightIcon className="h-5 w-5 text-muted-foreground transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
            </Link>
          ) : (
            <div className="mt-8 flex items-center gap-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 sm:p-5">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/5">
                <CalendarIcon className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">
                  No upcoming setlists
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground/60">
                  Create a setlist to see it here
                </p>
              </div>
              <Button
                onClick={() => setShowSetlistForm(true)}
                size="sm"
                variant="outline"
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Create
              </Button>
            </div>
          )}

          {/* Glass Stats Grid */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {stats.map((stat, i) => (
              <Link
                key={i}
                to={stat.link || "#"}
                className={cn(
                  "group relative overflow-hidden rounded-xl border border-white/5 bg-white/5 p-4 transition-all duration-200 hover:bg-white/10",
                  !stat.link && "cursor-default hover:bg-white/5"
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.label}
                    </p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-foreground">
                        {stat.value}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground/80">
                      {stat.subtext}
                    </p>
                  </div>
                  <div
                    className={cn("rounded-full bg-white/5 p-2.5", stat.color)}
                  >
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
                {/* Hover Glow Effect */}
                <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/5 blur-xl transition-all duration-500 group-hover:bg-white/10" />
              </Link>
            ))}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Column: Upcoming Setlists */}
          <div className="lg:col-span-2 space-y-6">
            <SetlistCard
              title="Upcoming Setlists"
              icon={CalendarIcon}
              setlists={displayedUpcomingSetlists}
              emptyMessage="No upcoming setlists found."
              emptyActionLabel="Create Your First Setlist"
              onEmptyAction={() => setShowSetlistForm(true)}
              showViewAll={
                upcomingSetlists.length > displayedUpcomingSetlists.length
              }
              maxItems={5}
            />

            {/* Empty Setlists This Week */}
            {emptyUpcomingSetlists.length > 0 && (
              <SetlistCard
                title="Still Planning"
                icon={ListMusicIcon}
                setlists={emptyUpcomingSetlists}
                showEmptyStyle={true}
                maxItems={emptyUpcomingSetlists.length}
              />
            )}
          </div>

          {/* Side Column: Activity / Links */}
          <div className="space-y-6">
            <Card className="border-white/10 bg-card/50 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                  <ClockIcon className="h-4 w-4 text-primary" />
                  Quick Access
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-1">
                <Link
                  to="/setlists"
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                >
                  <span className="flex items-center gap-2">
                    <ListMusicIcon className="h-4 w-4" />
                    All Setlists
                  </span>
                  <span className="text-xs font-medium">{setlists.length}</span>
                </Link>
                <Link
                  to="/songs"
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                >
                  <span className="flex items-center gap-2">
                    <Music2Icon className="h-4 w-4" />
                    Song Library
                  </span>
                  <span className="text-xs font-medium">{songs.length}</span>
                </Link>
              </CardContent>
            </Card>

            {/* Tip / Helper Card */}
            <Card className="border-primary/20 bg-primary/5 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-primary">
                  Pro Tip
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Use "Quick Access Songs" in Settings to create quick templates
                  for spontaneous worship moments.
                </p>
                <Button
                  variant="link"
                  className="mt-2 h-auto p-0 text-xs text-primary hover:text-primary/80"
                  onClick={() => navigate("/settings")}
                >
                  Go to Settings &rarr;
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Modals */}
        <SetlistForm
          open={showSetlistForm}
          onOpenChange={setShowSetlistForm}
          onSubmit={handleCreateSetlist}
        />

        <SongForm
          open={showSongForm}
          onOpenChange={setShowSongForm}
          onSubmit={handleCreateSong}
        />
      </div>
    </AppLayout>
  );
}
