import { SetlistSearchCombobox } from "@/components/setlists/setlist-search-combobox";
import { Header } from "@/components/layout/header";
import { SetlistList } from "@/components/setlists/setlist-list";
import { useSetlists } from "@/hooks/use-setlists";
import { toast } from "sonner";
import { Setlist } from "@/types";

export default function Setlists() {
  const { setlists, addSetlist, updateSetlist, deleteSetlist } = useSetlists();

  const handleAddSetlist = async (setlistData: Partial<Setlist>) => {
    try {
      await addSetlist(setlistData);
      toast.success("Setlist created", {
        description: `"${setlistData.name}" has been created`,
      });
    } catch (error) {
      toast.error("Error", {
        description:
          error instanceof Error ? error.message : "Failed to create setlist",
      });
    }
  };

  const handleEditSetlist = async (
    id: string,
    setlistData: Partial<Setlist>
  ) => {
    try {
      await updateSetlist(id, setlistData);
      toast.success("Setlist updated", {
        description: `"${setlistData.name}" has been updated`,
      });
    } catch (error) {
      toast.error("Error", {
        description:
          error instanceof Error ? error.message : "Failed to update setlist",
      });
    }
  };

  const handleDeleteSetlist = async (id: string) => {
    try {
      await deleteSetlist(id);
      toast.success("Setlist deleted", {
        description: "The setlist has been removed",
      });
    } catch (error) {
      toast.error("Error", {
        description:
          error instanceof Error ? error.message : "Failed to delete setlist",
      });
    }
  };

  return (
    <>
      <Header
        title="Setlists"
        searchBar={<SetlistSearchCombobox setlists={setlists} />}
      />

      <main className="flex-1 p-4">
        <SetlistList
          setlists={setlists}
          onAddSetlist={handleAddSetlist}
          onEditSetlist={handleEditSetlist}
          onDeleteSetlist={handleDeleteSetlist}
        />
      </main>
    </>
  );
}
