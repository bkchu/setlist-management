import { Setlist } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CalendarIcon, MoreHorizontal, Plus } from "lucide-react";
import { useState } from "react";
import { SetlistForm } from "./setlist-form";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";

interface SetlistListProps {
  setlists: Setlist[];
  onAddSetlist: (setlist: Partial<Setlist>) => void;
  onEditSetlist: (id: string, setlist: Partial<Setlist>) => void;
  onDeleteSetlist: (id: string) => void;
}

export function SetlistList({
  setlists,
  onAddSetlist,
  onEditSetlist,
  onDeleteSetlist,
}: SetlistListProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSetlist, setEditingSetlist] = useState<Setlist | null>(null);

  const handleAddSubmit = async (setlistData: Partial<Setlist>) => {
    await Promise.resolve(onAddSetlist(setlistData));
    setIsFormOpen(false);
    setEditingSetlist(null);
  };

  const handleEditSubmit = async (setlistData: Partial<Setlist>) => {
    if (editingSetlist) {
      await Promise.resolve(onEditSetlist(editingSetlist.id, setlistData));
      setIsFormOpen(false);
      setEditingSetlist(null);
    }
  };

  const handleOpenAddForm = () => {
    setEditingSetlist(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (setlist: Setlist) => {
    setEditingSetlist(setlist);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingSetlist(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h2 className="text-lg font-semibold">All Setlists</h2>
        <Button size="sm" onClick={handleOpenAddForm}>
          <Plus className="mr-2 h-4 w-4" />
          Add Setlist
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="hidden md:table-cell">Songs</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {setlists.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No setlists found. Create your first setlist!
                  </TableCell>
                </TableRow>
              ) : (
                setlists.map((setlist) => (
                  <motion.tr
                    key={setlist.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="group hover:bg-muted/50"
                  >
                    <TableCell>
                      <Link
                        to={`/setlist/${setlist.id}`}
                        className="block font-medium hover:underline"
                      >
                        {setlist.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                        {format(new Date(setlist.date), "MMM d, yyyy")}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {setlist.songs.length}{" "}
                      {setlist.songs.length === 1 ? "song" : "songs"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          asChild
                          onClick={(e) => e.preventDefault()}
                        >
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleOpenEditForm(setlist)}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onDeleteSetlist(setlist.id)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>

      {/* Single dialog for both add and edit */}
      <SetlistForm
        open={isFormOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseForm();
        }}
        setlist={editingSetlist ?? undefined}
        onSubmit={editingSetlist ? handleEditSubmit : handleAddSubmit}
      />
    </div>
  );
}
