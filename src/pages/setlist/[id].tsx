import { useParams, useNavigate } from "react-router-dom";
import { useSetlists } from "@/hooks/use-setlists";
import { useSongs } from "@/hooks/use-songs";
import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SetlistForm } from "@/components/setlists/setlist-form";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { EditIcon, Music2Icon, ArrowUpIcon, ArrowDownIcon, XIcon, CheckIcon, PlusIcon, MusicIcon, History, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatePresence, motion } from "framer-motion";
import { SetlistSong, SongFile } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import useEmblaCarousel from 'embla-carousel-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { supabase } from "@/lib/supabase";

// Set worker URL for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const KEY_OPTIONS = [
  'G', 'Gb', 'F#', 'F', 'E', 'Eb', 'D', 'Db', 'C#', 'C', 'B', 'Bb', 'A', 'Ab'
];

interface EditableSetlistSong extends Partial<SetlistSong> {
  isNew?: boolean;
}

interface FileWithUrl extends SongFile {
  url?: string;
  songTitle: string;
  songArtist: string;
}

export default function SetlistPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setlists, updateSetlist, updateSetlistSongs } = useSetlists();
  const { songs } = useSongs();
  const [isEditing, setIsEditing] = useState(false);
  const [editingSongs, setEditingSongs] = useState<Record<string, EditableSetlistSong>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSetlistSong, setNewSetlistSong] = useState<EditableSetlistSong>({
    songId: "",
    key: "",
    notes: "",
  });
  const [allFiles, setAllFiles] = useState<FileWithUrl[]>([]);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: 'center' });
  const [currentSlide, setCurrentSlide] = useState(0);
  const [numPages, setNumPages] = useState<Record<string, number>>({});
  const [showCarousel, setShowCarousel] = useState(false);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  
  const setlist = setlists.find(s => s.id === id);

  useEffect(() => {
    if (!setlist && !useSetlists().isLoading) {
      navigate("/setlists");
      toast({
        title: "Setlist not found",
        description: "The requested setlist could not be found.",
        variant: "destructive",
      });
    }
  }, [setlist, navigate]);

  useEffect(() => {
    const updateDimensions = () => {
      const container = document.querySelector('.carousel-container');
      if (container) {
        setContainerDimensions({
          width: container.clientWidth - 48, // Subtract padding
          height: container.clientHeight - 180, // Subtract header and padding
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => window.removeEventListener('resize', updateDimensions);
  }, [showCarousel]);

  useEffect(() => {
    if (setlist) {
      const loadFiles = async () => {
        const files: FileWithUrl[] = [];
        
        for (const setlistSong of setlist.songs) {
          const song = songs.find(s => s.id === setlistSong.songId);
          if (song?.files) {
            for (const file of song.files) {
              try {
                const { data, error } = await supabase.storage
                  .from('song-files')
                  .createSignedUrl(file.path, 3600);

                if (error) {
                  console.error('Error getting signed URL:', error);
                  continue;
                }

                files.push({
                  ...file,
                  url: data.signedUrl,
                  songTitle: song.title,
                  songArtist: song.artist,
                });
              } catch (error) {
                console.error('Error loading file:', error);
              }
            }
          }
        }
        
        setAllFiles(files);
      };

      loadFiles();
    }
  }, [setlist, songs]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  useEffect(() => {
    if (emblaApi) {
      emblaApi.on('select', () => {
        setCurrentSlide(emblaApi.selectedScrollSnap());
      });
    }
  }, [emblaApi]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }, path: string) => {
    setNumPages(prev => ({ ...prev, [path]: numPages }));
  };

  const getFileExtension = (filename: string) => {
    return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2).toLowerCase();
  };

  const isImage = (filename: string) => {
    const ext = getFileExtension(filename);
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  };

  const isPDF = (filename: string) => {
    return getFileExtension(filename) === 'pdf';
  };

  const songsNotInSetlist = songs.filter(
    (song) => !setlist?.songs.some((s) => s.songId === song.id)
  );

  const selectedSong = newSetlistSong.songId 
    ? songs.find(s => s.id === newSetlistSong.songId)
    : null;

  const handleEditSetlist = async (setlistData: Partial<typeof setlist>) => {
    if (!setlist) return;
    
    try {
      await updateSetlist(setlist.id, setlistData);
      setIsEditing(false);
      toast({
        title: "Setlist updated",
        description: "The setlist has been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update setlist",
        variant: "destructive",
      });
    }
  };

  const handleStartEdit = (setlistSong: SetlistSong) => {
    setEditingSongs(prev => ({
      ...prev,
      [setlistSong.id]: {
        songId: setlistSong.songId,
        key: setlistSong.key,
        notes: setlistSong.notes,
        order: setlistSong.order,
        song: setlistSong.song,
      }
    }));
  };

  const handleCancelEdit = (songId: string) => {
    setEditingSongs(prev => {
      const { [songId]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleSaveEdit = async (songId: string) => {
    if (!setlist) return;
    const editedSong = editingSongs[songId];
    if (!editedSong) return;

    try {
      const updatedSongs = setlist.songs.map(s => 
        s.id === songId
          ? { ...s, key: editedSong.key, notes: editedSong.notes }
          : s
      );
      
      await updateSetlistSongs(setlist.id, updatedSongs);
      setEditingSongs(prev => {
        const { [songId]: _, ...rest } = prev;
        return rest;
      });
      toast({
        title: "Song updated",
        description: "Changes have been saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update song",
        variant: "destructive",
      });
    }
  };

  const handleAddNewSong = async () => {
    if (!setlist || !newSetlistSong.songId) {
      toast({
        title: "No song selected",
        description: "Please select a song to add",
        variant: "destructive",
      });
      return;
    }

    const song = songs.find((s) => s.id === newSetlistSong.songId);
    if (!song) return;

    try {
      const newSong: SetlistSong = {
        id: crypto.randomUUID(),
        songId: newSetlistSong.songId,
        order: setlist.songs.length + 1,
        key: newSetlistSong.key,
        notes: newSetlistSong.notes,
        song,
      };

      await updateSetlistSongs(setlist.id, [...setlist.songs, newSong]);
      setNewSetlistSong({
        songId: "",
        key: "",
        notes: "",
      });
      setShowAddForm(false);
      toast({
        title: "Song added",
        description: "New song has been added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add song",
        variant: "destructive",
      });
    }
  };

  const handleRemoveSong = async (songId: string) => {
    if (!setlist) return;
    
    try {
      const updatedSongs = setlist.songs
        .filter((s) => s.id !== songId)
        .map((s, idx) => ({ ...s, order: idx + 1 }));
      
      await updateSetlistSongs(setlist.id, updatedSongs);
      toast({
        title: "Song removed",
        description: "The song has been removed from the setlist",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove song",
        variant: "destructive",
      });
    }
  };

  const handleReorderSong = async (songId: string, direction: 'up' | 'down') => {
    if (!setlist) return;
    
    const songIndex = setlist.songs.findIndex((s) => s.id === songId);
    if (songIndex === -1) return;

    const newIndex = direction === 'up' ? songIndex - 1 : songIndex + 1;
    if (newIndex < 0 || newIndex >= setlist.songs.length) return;

    try {
      const updatedSongs = [...setlist.songs];
      const temp = updatedSongs[songIndex];
      updatedSongs[songIndex] = updatedSongs[newIndex];
      updatedSongs[newIndex] = temp;

      const reorderedSongs = updatedSongs.map((s, idx) => ({
        ...s,
        order: idx + 1,
      }));

      await updateSetlistSongs(setlist.id, reorderedSongs);
      toast({
        title: "Order updated",
        description: "The song order has been updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update song order",
        variant: "destructive",
      });
    }
  };

  const renderKeyHistory = (song: typeof selectedSong) => {
    if (!song?.keyHistory?.length) return null;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <History className="h-4 w-4" />
          <span>Key History</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {song.keyHistory.map((entry) => (
            <Button
              key={entry.id}
              variant="outline"
              size="sm"
              className="h-auto py-1"
              onClick={() => {
                if (editingSongs[entry.setlistId]) {
                  setEditingSongs(prev => ({
                    ...prev,
                    [entry.setlistId]: { ...prev[entry.setlistId], key: entry.key },
                  }));
                } else {
                  setNewSetlistSong(prev => ({ ...prev, key: entry.key }));
                }
              }}
            >
              <Badge variant="secondary" className="mr-2">
                {entry.key}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {format(new Date(entry.playedAt), "MMM d")}
              </span>
            </Button>
          ))}
        </div>
      </div>
    );
  };

  if (!setlist) {
    return null;
  }

  return (
    <div className="flex h-screen flex-col">
      <Header title={setlist.name}>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowCarousel(true)}
            disabled={allFiles.length === 0}
          >
            View Files
          </Button>
          <Button onClick={() => setIsEditing(true)}>
            <EditIcon className="mr-2 h-4 w-4" />
            Edit Setlist
          </Button>
        </div>
      </Header>

      {/* File Carousel Dialog */}
      <Dialog open={showCarousel} onOpenChange={setShowCarousel}>
        <DialogContent className="max-w-7xl p-0">
          <DialogTitle className="p-6">
            Files ({currentSlide + 1} of {allFiles.length})
          </DialogTitle>
          <div className="carousel-container relative h-[calc(100vh-200px)]">
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex">
                {allFiles.map((file, index) => (
                  <div
                    key={file.path}
                    className="relative min-w-full flex-[0_0_100%]"
                  >
                    <div className="p-6">
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold">{file.songTitle}</h3>
                        <p className="text-sm text-muted-foreground">{file.songArtist}</p>
                      </div>
                      <div className="flex justify-center overflow-y-auto" style={{ maxHeight: containerDimensions.height }}>
                        {isImage(file.name) && file.url && (
                          <img
                            src={file.url}
                            alt={file.name}
                            className="h-auto w-auto max-w-full rounded-lg object-contain"
                            style={{
                              maxHeight: containerDimensions.height,
                              maxWidth: containerDimensions.width,
                            }}
                          />
                        )}
                        {isPDF(file.name) && file.url && (
                          <Document
                            file={file.url}
                            onLoadSuccess={(pdf) => onDocumentLoadSuccess(pdf, file.path)}
                            loading={
                              <div className="flex h-[600px] items-center justify-center">
                                <div className="text-center">
                                  <div className="mb-2 animate-spin">
                                    <Music2Icon className="h-8 w-8" />
                                  </div>
                                  <p>Loading PDF...</p>
                                </div>
                              </div>
                            }
                          >
                            {Array.from(
                              new Array(numPages[file.path] || 0),
                              (_, pageIndex) => (
                                <div key={`page_${pageIndex + 1}`} className="mb-4">
                                  <Page
                                    pageNumber={pageIndex + 1}
                                    width={Math.min(800, containerDimensions.width)}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                  />
                                </div>
                              )
                            )}
                          </Document>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {allFiles.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur-sm"
                  onClick={scrollPrev}
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur-sm"
                  onClick={scrollNext}
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex-1 space-y-8 overflow-auto p-8">
        <Breadcrumb
          items={[
            { href: "/setlists", label: "Setlists" },
            { href: `/setlist/${setlist.id}`, label: setlist.name },
          ]}
        />

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Songs</h2>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddForm(true)}
                    disabled={showAddForm || songsNotInSetlist.length === 0}
                  >
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Add Song
                  </Button>
                </div>

                {setlist.songs.length === 0 && !showAddForm ? (
                  <div className="rounded-md border border-dashed p-8 text-center">
                    <Music2Icon className="mx-auto h-8 w-8 text-muted-foreground" />
                    <h3 className="mt-2 text-sm font-medium">No songs added yet</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Add songs to your setlist to get started
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence>
                      {setlist.songs.map((setlistSong, index) => {
                        const isEditing = !!editingSongs[setlistSong.id];
                        return (
                          <motion.div
                            key={setlistSong.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-between rounded-md border p-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                {index + 1}
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-medium">
                                  {setlistSong.song.title} - {setlistSong.song.artist}
                                </p>
                                {isEditing ? (
                                  <div className="flex gap-2">
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-8">
                                          {editingSongs[setlistSong.id]?.key || "Select Key"}
                                          <MusicIcon className="ml-2 h-3 w-3" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-64 p-3" align="start">
                                        <div className="space-y-3">
                                          <div className="space-y-1">
                                            <Label>Common Keys</Label>
                                            <div className="grid grid-cols-4 gap-1">
                                              {KEY_OPTIONS.map((key) => (
                                                <Button
                                                  key={key}
                                                  variant={editingSongs[setlistSong.id]?.key === key ? "default" : "outline"}
                                                  size="sm"
                                                  className="h-8"
                                                  onClick={() =>
                                                    setEditingSongs(prev => ({
                                                      ...prev,
                                                      [setlistSong.id]: {
                                                        ...prev[setlistSong.id],
                                                        key,
                                                      },
                                                    }))
                                                  }
                                                >
                                                  {key}
                                                </Button>
                                              ))}
                                            </div>
                                          </div>
                                          {renderKeyHistory(setlistSong.song)}
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                    <Input
                                      value={editingSongs[setlistSong.id]?.notes || ""}
                                      onChange={(e) =>
                                        setEditingSongs(prev => ({
                                          ...prev,
                                          [setlistSong.id]: {
                                            ...prev[setlistSong.id],
                                            notes: e.target.value,
                                          },
                                        }))
                                      }
                                      placeholder="Add notes"
                                      className="flex-1"
                                    />
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground">
                                    {setlistSong.key && `Key: ${setlistSong.key}`}
                                    {setlistSong.key && setlistSong.notes && " • "}
                                    {setlistSong.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {isEditing ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleSaveEdit(setlistSong.id)}
                                  >
                                    <CheckIcon className="h-4 w-4 text-green-500" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleCancelEdit(setlistSong.id)}
                                  >
                                    <XIcon className="h-4 w-4 text-red-500" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleReorderSong(setlistSong.id, "up")}
                                    disabled={index === 0}
                                  >
                                    <span className="sr-only">Move up</span>
                                    <ArrowUpIcon className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleReorderSong(setlistSong.id, "down")}
                                    disabled={index === setlist.songs.length - 1}
                                  >
                                    <span className="sr-only">Move down</span>
                                    <ArrowDownIcon className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleStartEdit(setlistSong)}
                                  >
                                    <EditIcon className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => handleRemoveSong(setlistSong.id)}
                                  >
                                    <XIcon className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                      {showAddForm && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center justify-between rounded-md border border-dashed p-3 bg-muted/30"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                              {setlist.songs.length + 1}
                            </div>
                            <div className="space-y-2">
                              <Select
                                value={newSetlistSong.songId}
                                onValueChange={(value) =>
                                  setNewSetlistSong(prev => ({ 
                                    ...prev, 
                                    songId: value,
                                  }))
                                }
                              >
                                <SelectTrigger className="w-[200px]">
                                  <SelectValue placeholder="Select a song" />
                                </SelectTrigger>
                                <SelectContent>
                                  {songsNotInSetlist.map((song) => (
                                    <SelectItem key={song.id} value={song.id}>
                                      {song.title} - {song.artist}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div className="flex gap-2">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-8">
                                      {newSetlistSong.key || "Select Key"}
                                      <MusicIcon className="ml-2 h-3 w-3" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-64 p-3" align="start">
                                    <div className="space-y-3">
                                      <div className="space-y-1">
                                        <Label>Common Keys</Label>
                                        <div className="grid grid-cols-4 gap-1">
                                          {KEY_OPTIONS.map((key) => (
                                            <Button
                                              key={key}
                                              variant={newSetlistSong.key === key ? "default" : "outline"}
                                              size="sm"
                                              className="h-8"
                                              onClick={() =>
                                                setNewSetlistSong(prev => ({
                                                  ...prev,
                                                  key,
                                                }))
                                              }
                                            >
                                              {key}
                                            </Button>
                                          ))}
                                        </div>
                                      </div>
                                      {renderKeyHistory(selectedSong)}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                                <Input
                                  value={newSetlistSong.notes || ""}
                                  onChange={(e) =>
                                    setNewSetlistSong(prev => ({ ...prev, notes: e.target.value }))
                                  }
                                  placeholder="Add notes"
                                  className="flex-1"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleAddNewSong}
                            >
                              <CheckIcon className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setShowAddForm(false)}
                            >
                              <XIcon className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold">Information</h2>
                <div className="mt-2 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span>{format(new Date(setlist.date), "MMMM d, yyyy")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Songs</span>
                    <span>{setlist.songs.length}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>{format(new Date(setlist.createdAt), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last updated</span>
                    <span>{format(new Date(setlist.updatedAt), "MMM d, yyyy")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-md">
          <SetlistForm
            setlist={setlist}
            onSubmit={handleEditSetlist}
            onCancel={() => setIsEditing(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}