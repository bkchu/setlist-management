import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useJoinCodes, getJoinUrl } from "@/hooks/use-join-codes";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DataList,
  DataListItem,
  DataListLabel,
  DataListValue,
} from "@/components/ui/data-list";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CopyIcon,
  MoreHorizontal,
  PlusIcon,
  Loader2Icon,
  LinkIcon,
  TrashIcon,
  UsersIcon,
} from "lucide-react";

export function JoinCodeManager() {
  const { user } = useAuth();
  const {
    joinCodes,
    isLoading,
    generateJoinCode,
    revokeJoinCode,
    refreshJoinCodes,
  } = useJoinCodes();

  const [isGenerating, setIsGenerating] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState("24");

  // Check if user is owner
  const isOwner =
    user?.organizations.find(
      (org) => org.organizationId === user.organizationId
    )?.role === "owner";

  if (!isOwner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Join Codes
          </CardTitle>
          <CardDescription>
            Only organization owners can manage join codes. If you need to
            invite someone, please ask an owner to generate a code and share the
            link with them.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleGenerateCode = async () => {
    if (!user?.organizationId) return;

    setIsGenerating(true);
    try {
      const newCode = await generateJoinCode({
        organizationId: user.organizationId,
        expiresInHours: parseInt(expiresInHours),
      });

      toast.success("Join code generated successfully!");

      // Auto-copy the URL to clipboard
      const joinUrl = getJoinUrl(newCode.code);
      await navigator.clipboard.writeText(joinUrl);
      toast.success("Join URL copied to clipboard!");
    } catch (error) {
      console.error("Failed to generate join code:", error);
      toast.error("Failed to generate join code");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyUrl = async (code: string) => {
    try {
      const url = getJoinUrl(code);
      await navigator.clipboard.writeText(url);
      toast.success("Join URL copied to clipboard!");
    } catch {
      toast.error("Failed to copy URL");
    }
  };

  const handleRevokeCode = async (codeId: string) => {
    try {
      await revokeJoinCode(codeId);
    } catch (error) {
      console.error("Failed to revoke join code:", error);
      toast.error("Failed to revoke join code");
    }
  };

  const getCodeStatus = (code: (typeof joinCodes)[0]) => {
    if (code.usedAt) {
      return { status: "used", variant: "secondary" as const };
    }

    const now = new Date();
    const expiresAt = new Date(code.expiresAt);

    if (expiresAt < now) {
      return { status: "expired", variant: "destructive" as const };
    }

    return { status: "active", variant: "default" as const };
  };

  const activeCodesCount = joinCodes.filter((code) => {
    const { status } = getCodeStatus(code);
    return status === "active";
  }).length;

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Join Code Management
          </CardTitle>
          <CardDescription>
            Generate and manage join codes for your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {activeCodesCount}
              </div>
              <div className="text-sm text-muted-foreground">Active Codes</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">
                {joinCodes.filter((c) => c.usedAt).length}
              </div>
              <div className="text-sm text-muted-foreground">Used Codes</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{joinCodes.length}</div>
              <div className="text-sm text-muted-foreground">Total Codes</div>
            </div>
          </div>

          {/* Generate New Code Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Generate New Join Code</h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="expiration">Expires in</Label>
                <Select
                  value={expiresInHours}
                  onValueChange={setExpiresInHours}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select expiration time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="6">6 hours</SelectItem>
                    <SelectItem value="24">24 hours (default)</SelectItem>
                    <SelectItem value="72">3 days</SelectItem>
                    <SelectItem value="168">1 week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleGenerateCode}
                  disabled={isGenerating}
                  className="gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2Icon className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <PlusIcon className="h-4 w-4" />
                      Generate Code
                    </>
                  )}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Share the generated link with invitees. Codes are single-use and
              expire after the selected time.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Join Codes Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Join Codes</CardTitle>
            <CardDescription>
              Manage all join codes for your organization
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={refreshJoinCodes}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2Icon className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading join codes...</span>
            </div>
          ) : joinCodes.length === 0 ? (
            <div className="text-center py-8">
              <LinkIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <h3 className="font-medium mb-1">No join codes yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Generate your first join code to invite team members
              </p>
            </div>
          ) : (
            <>
              {/* Mobile stacked list */}
              <div className="md:hidden space-y-3">
                {joinCodes.map((code) => {
                  const { status, variant } = getCodeStatus(code);
                  const now = new Date();
                  const expiresAt = new Date(code.expiresAt);
                  const msRemaining = expiresAt.getTime() - now.getTime();
                  const hoursRemaining = Math.max(
                    0,
                    Math.floor(msRemaining / (1000 * 60 * 60))
                  );
                  const minutesRemaining = Math.max(
                    0,
                    Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60))
                  );
                  return (
                    <div
                      key={code.id}
                      className="rounded-lg border p-4 space-y-3"
                      aria-label={`Join code ${code.code}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-mono font-semibold text-base">
                          {code.code}
                        </div>
                        <Badge variant={variant} className="capitalize">
                          {status}
                        </Badge>
                      </div>
                      <DataList className="space-y-2" size="sm">
                        <DataListItem className="justify-between">
                          <DataListLabel>Time Remaining</DataListLabel>
                          <DataListValue>
                            {status === "active" ? (
                              <span>
                                {hoursRemaining}h {minutesRemaining}m
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </DataListValue>
                        </DataListItem>
                        <DataListItem className="justify-between">
                          <DataListLabel>Expires</DataListLabel>
                          <DataListValue>
                            {format(
                              new Date(code.expiresAt),
                              "MMM d, yyyy 'at' h:mm a"
                            )}
                          </DataListValue>
                        </DataListItem>
                        <DataListItem className="justify-between">
                          <DataListLabel>Used By</DataListLabel>
                          <DataListValue>
                            {code.usedBy ? (
                              <span className="inline-flex items-center gap-1">
                                <UsersIcon className="h-3 w-3" />
                                {code.usedBy}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </DataListValue>
                        </DataListItem>
                        <DataListItem className="justify-between">
                          <DataListLabel>Used At</DataListLabel>
                          <DataListValue>
                            {code.usedAt ? (
                              format(new Date(code.usedAt), "MMM d, yyyy")
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </DataListValue>
                        </DataListItem>
                      </DataList>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyUrl(code.code)}
                        >
                          Copy URL
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(code.code);
                              toast.success("Code copied!");
                            } catch {
                              toast.error("Failed to copy code");
                            }
                          }}
                        >
                          Copy Code
                        </Button>
                        {status === "active" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={(e) => e.preventDefault()}
                              >
                                Revoke
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Revoke Join Code
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to revoke this join
                                  code? This action cannot be undone and the
                                  code will no longer work.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRevokeCode(code.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Revoke Code
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time Remaining</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Used By</TableHead>
                      <TableHead>Used At</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {joinCodes.map((code) => {
                      const { status, variant } = getCodeStatus(code);
                      const now = new Date();
                      const expiresAt = new Date(code.expiresAt);
                      const msRemaining = expiresAt.getTime() - now.getTime();
                      const hoursRemaining = Math.max(
                        0,
                        Math.floor(msRemaining / (1000 * 60 * 60))
                      );
                      const minutesRemaining = Math.max(
                        0,
                        Math.floor(
                          (msRemaining % (1000 * 60 * 60)) / (1000 * 60)
                        )
                      );
                      return (
                        <TableRow key={code.id}>
                          <TableCell className="font-mono font-medium">
                            {code.code}
                          </TableCell>
                          <TableCell>
                            <Badge variant={variant} className="capitalize">
                              {status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {status === "active" ? (
                              <span className="text-sm">
                                {hoursRemaining}h {minutesRemaining}m
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {format(
                              new Date(code.createdAt),
                              "MMM d, yyyy 'at' h:mm a"
                            )}
                          </TableCell>
                          <TableCell>
                            {format(
                              new Date(code.expiresAt),
                              "MMM d, yyyy 'at' h:mm a"
                            )}
                          </TableCell>
                          <TableCell>
                            {code.usedBy ? (
                              <div className="flex items-center gap-1">
                                <UsersIcon className="h-3 w-3" />
                                <span className="text-sm">{code.usedBy}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {code.usedAt ? (
                              format(new Date(code.usedAt), "MMM d, yyyy")
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleCopyUrl(code.code)}
                                  className="gap-2"
                                >
                                  <CopyIcon className="h-4 w-4" />
                                  Copy Join URL
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={async () => {
                                    try {
                                      const joinUrl = getJoinUrl(code.code);
                                      const subject = encodeURIComponent(
                                        `Join our Setlify organization`
                                      );
                                      const body = encodeURIComponent(
                                        `Hi!\n\nUse this link to join our organization on Setlify:\n${joinUrl}\n\nThe link is single-use and expires at ${format(
                                          new Date(code.expiresAt),
                                          "MMM d, yyyy 'at' h:mm a"
                                        )}.\n\nThanks!`
                                      );
                                      window.location.href = `mailto:?subject=${subject}&body=${body}`;
                                    } catch {
                                      toast.error(
                                        "Failed to open email composer"
                                      );
                                    }
                                  }}
                                  className="gap-2"
                                >
                                  <LinkIcon className="h-4 w-4" />
                                  Compose Email Invite
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={async () => {
                                    try {
                                      await navigator.clipboard.writeText(
                                        code.code
                                      );
                                      toast.success(
                                        "Code copied to clipboard!"
                                      );
                                    } catch {
                                      toast.error("Failed to copy code");
                                    }
                                  }}
                                  className="gap-2"
                                >
                                  <CopyIcon className="h-4 w-4" />
                                  Copy Code Only
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={async () => {
                                    try {
                                      const joinUrl = getJoinUrl(code.code);
                                      const message = `Join our Setlify organization: ${joinUrl} (single-use, expires at ${format(
                                        new Date(code.expiresAt),
                                        "MMM d, yyyy 'at' h:mm a"
                                      )})`;
                                      await navigator.clipboard.writeText(
                                        message
                                      );
                                      toast.success("Invite message copied!");
                                    } catch {
                                      toast.error("Failed to copy message");
                                    }
                                  }}
                                  className="gap-2"
                                >
                                  <CopyIcon className="h-4 w-4" />
                                  Copy Invite Message
                                </DropdownMenuItem>
                                {status === "active" && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem
                                        onSelect={(e) => e.preventDefault()}
                                        className="gap-2 text-destructive focus:text-destructive"
                                      >
                                        <TrashIcon className="h-4 w-4" />
                                        Revoke Code
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          Revoke Join Code
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to revoke this
                                          join code? This action cannot be
                                          undone and the code will no longer
                                          work.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            handleRevokeCode(code.id)
                                          }
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Revoke Code
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
