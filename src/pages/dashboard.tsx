import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSetlists } from "@/hooks/use-setlists";
import { useSongs } from "@/hooks/use-songs";
import { CalendarIcon, ListMusicIcon, MusicIcon, PlayIcon } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { songs } = useSongs();
  const { setlists } = useSetlists();

  // Find next setlist - closest to today
  const sortedSetlists = [...setlists].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  const upcomingSetlists = sortedSetlists.filter(
    (setlist) => new Date(setlist.date) >= new Date()
  );

  const nextSetlist = upcomingSetlists.length > 0 ? upcomingSetlists[0] : null;

  return (
    <div className="flex h-screen flex-col">
      <Header title="Dashboard" />
      
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Songs</CardTitle>
              <MusicIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{songs.length}</div>
              <p className="text-xs text-muted-foreground">
                Songs in your library
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Setlists</CardTitle>
              <ListMusicIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{setlists.length}</div>
              <p className="text-xs text-muted-foreground">
                Planned worship setlists
              </p>
            </CardContent>
          </Card>
          
          <Card className="md:col-span-2 lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Setlist</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {nextSetlist ? (
                <>
                  <div className="text-2xl font-bold">{nextSetlist.name}</div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(nextSetlist.date), "EEEE, MMMM d, yyyy")}
                  </p>
                  <p className="mt-2 text-sm">
                    {nextSetlist.songs.length} songs planned
                  </p>
                </>
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
                  Add songs to your library and create setlists for your worship services.
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
                {[...songs].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                  .slice(0, 5)
                  .map(song => (
                    <div key={song.id} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <MusicIcon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{song.title}</p>
                          <p className="text-sm text-muted-foreground">{song.artist}</p>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(song.updatedAt), "MMM d, yyyy")}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}