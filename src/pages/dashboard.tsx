import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/app-layout";
import { useSetlists } from "@/hooks/use-setlists";
import { useSongs } from "@/hooks/use-songs";
import { CalendarIcon, ListMusicIcon, MusicIcon, PlayIcon } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { songs } = useSongs();
  const { setlists } = useSetlists();

  // Find next setlist - closest to today
  const sortedSetlists = [...setlists].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const upcomingSetlists = sortedSetlists.filter(
    (setlist) => new Date(setlist.date) >= new Date()
  );

  const nextSetlist = upcomingSetlists.length > 0 ? upcomingSetlists[0] : null;

  return (
    <AppLayout title="Dashboard">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Songs</CardTitle>
            <MusicIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{songs.length}</div>
                <p className="text-xs text-muted-foreground">
                  Songs in your library
                </p>
              </div>
              <Link
                to="/songs"
                className="ml-2 rounded px-2 py-1 text-xs text-primary border border-primary hover:bg-primary/10 transition"
                aria-label="Go to Songs"
              >
                View
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Setlists
            </CardTitle>
            <ListMusicIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{setlists.length}</div>
                <p className="text-xs text-muted-foreground">
                  Planned worship setlists
                </p>
              </div>
              <Link
                to="/setlists"
                className="ml-2 rounded px-2 py-1 text-xs text-primary border border-primary hover:bg-primary/10 transition"
                aria-label="Go to Setlists"
              >
                View
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Setlist</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {nextSetlist ? (
              <Link
                to={`/setlist/${nextSetlist.id}`}
                className="block rounded hover:bg-primary/10 transition p-2 -m-2"
                aria-label={`Go to setlist ${nextSetlist.name}`}
              >
                <div className="text-2xl font-bold">{nextSetlist.name}</div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(nextSetlist.date), "EEEE, MMMM d, yyyy")}
                </p>
                <p className="mt-2 text-sm">
                  {nextSetlist.songs.length} songs planned
                </p>
              </Link>
            ) : (
              <>
                <div className="text-lg font-medium">No upcoming setlists</div>
                <p className="text-xs text-muted-foreground">
                  Create your first setlist to get started
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="mb-4 text-lg font-semibold">Recent Activity</h2>
        <div className="rounded-lg border">
          {songs.length === 0 && setlists.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="rounded-full bg-primary/10 p-3">
                <PlayIcon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-medium">Let's get started</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Add songs to your library and create setlists for your worship
                services.
              </p>
              <div className="mt-6 flex gap-2">
                <Link to="/songs" className="text-sm text-primary underline">
                  Go to Songs
                </Link>
                <Link to="/setlists" className="text-sm text-primary underline">
                  Go to Setlists
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y">
              {/* Gather and sort recent items from both songs and setlists */}
              {[
                ...[...songs].map((song) => ({
                  type: "song",
                  id: song.id,
                  title: song.title,
                  subtitle: song.artist,
                  date: song.updatedAt,
                  icon: <MusicIcon className="h-5 w-5 text-muted-foreground" />,
                  link: `/song/${song.id}`,
                })),
                ...[...setlists].map((setlist) => ({
                  type: "setlist",
                  id: setlist.id,
                  title: setlist.name,
                  subtitle: format(new Date(setlist.date), "MMM d, yyyy"),
                  date: setlist.updatedAt || setlist.date, // fallback if no updatedAt
                  icon: (
                    <ListMusicIcon className="h-5 w-5 text-muted-foreground" />
                  ),
                  link: `/setlist/${setlist.id}`,
                })),
              ]
                .sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                )
                .slice(0, 7)
                .map((item) => (
                  <Link
                    key={item.type + "-" + item.id}
                    to={item.link}
                    className="flex items-center justify-between p-4 hover:bg-primary/5 transition"
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(item.date), "MMM d, yyyy")}
                    </div>
                  </Link>
                ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
