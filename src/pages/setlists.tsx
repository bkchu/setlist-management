import { useState } from "react";
import { Header } from "@/components/layout/header";
import { SetlistList } from "@/components/setlists/setlist-list";
import { useSetlists } from "@/hooks/use-setlists";
import { toast } from "@/hooks/use-toast";
import { Setlist } from "@/types";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SetlistForm } from "@/components/setlists/setlist-form";

export default function Setlists() {
  const { setlists, addSetlist, updateSetlist, deleteSetlist } = useSetlists();

  const handleAddSetlist = async (setlistData: Partial<Setlist>) => {
    try {
      await addSetlist(setlistData);
      toast({
        title: "Setlist created",
        description: `"${setlistData.name}" has been created`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create setlist",
        variant: "destructive",
      });
    }
  };

  const handleEditSetlist = async (id: string, setlistData: Partial<Setlist>) => {
    try {
      await updateSetlist(id, setlistData);
      toast({
        title: "Setlist updated",
        description: `"${setlistData.name}" has been updated`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update setlist",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSetlist = async (id: string) => {
    try {
      await deleteSetlist(id);
      toast({
        title: "Setlist deleted",
        description: "The setlist has been removed",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete setlist",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-screen flex-col">
      <Header title="Setlists" />
      
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <SetlistList 
          setlists={setlists}
          onAddSetlist={handleAddSetlist}
          onEditSetlist={handleEditSetlist}
          onDeleteSetlist={handleDeleteSetlist}
        />
      </main>
    </div>
  );
}