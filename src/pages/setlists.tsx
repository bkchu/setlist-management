import { SetlistList } from "@/components/setlists/setlist-list";
import { toast } from "sonner";
import { Setlist } from "@/types";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useGetSetlistsByOrganization } from "@/api/setlists/list";
import { useCreateSetlist } from "@/api/setlists/post";
import { useUpdateSetlist } from "@/api/setlists/put";
import { useDeleteSetlist } from "@/api/setlists/delete";
import { AppLayout } from "@/components/layout/app-layout";

export default function Setlists() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: setlists = [] } = useGetSetlistsByOrganization(
    user?.organizationId
  );
  const createSetlist = useCreateSetlist();
  const updateSetlist = useUpdateSetlist();
  const deleteSetlist = useDeleteSetlist();

  const handleAddSetlist = async (setlistData: Partial<Setlist>) => {
    try {
      if (!user?.organizationId) throw new Error("No organization selected");
      const created = await createSetlist.mutateAsync({
        name: setlistData.name!,
        date: setlistData.date!,
        organizationId: user.organizationId,
      });
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

  const handleEditSetlist = async (
    id: string,
    setlistData: Partial<Setlist>
  ) => {
    try {
      await updateSetlist.mutateAsync({ id, payload: setlistData });
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
      await deleteSetlist.mutateAsync(id);
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
    <AppLayout title="Setlists" subtitle="Manage your worship sets">
      <SetlistList
        setlists={setlists}
        onAddSetlist={handleAddSetlist}
        onEditSetlist={handleEditSetlist}
        onDeleteSetlist={handleDeleteSetlist}
      />
    </AppLayout>
  );
}
