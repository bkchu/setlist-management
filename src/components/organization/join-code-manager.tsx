import { Fragment, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  useJoinCodes,
  getJoinUrl,
  type JoinCode,
} from "@/hooks/use-join-codes";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type InviteStatus = "active" | "used" | "expired";

const STATUS_LABELS: Record<InviteStatus, string> = {
  active: "Active",
  used: "Used",
  expired: "Expired",
};

const STATUS_ORDER: InviteStatus[] = ["active", "used", "expired"];
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
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
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
  const [latestInvite, setLatestInvite] = useState<JoinCode | null>(null);
  const [statusFilter, setStatusFilter] = useState<InviteStatus | "all">(
    "all"
  );

  const handleGenerateCode = async () => {
    if (!user?.organizationId) return;

    setIsGenerating(true);
    try {
      const newCode = await generateJoinCode({
        organizationId: user.organizationId,
        expiresInHours: parseInt(expiresInHours),
      });

      setLatestInvite(newCode);
      toast.success("Invite link generated successfully!");

      // Auto-copy the URL to clipboard
      const joinUrl = getJoinUrl(newCode.code);
      await navigator.clipboard.writeText(joinUrl);
      toast.success("Invite link copied to clipboard!");
    } catch (error) {
      console.error("Failed to generate invite link:", error);
      toast.error("Failed to generate invite link");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyUrl = async (code: string) => {
    try {
      const url = getJoinUrl(code);
      await navigator.clipboard.writeText(url);
      toast.success("Invite link copied to clipboard!");
    } catch {
      toast.error("Failed to copy invite link");
    }
  };

  const handleCopyCodeOnly = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Invite code copied!");
    } catch {
      toast.error("Failed to copy invite code");
    }
  };

  const handleCopyInviteMessage = async (code: string, expiresAt: string) => {
    try {
      const joinUrl = getJoinUrl(code);
      const expiryText = expiresAt
        ? ` (single-use, expires at ${format(
            new Date(expiresAt),
            "MMM d, yyyy 'at' h:mm a"
          )})`
        : "";
      const message = `Join our Setlify organization: ${joinUrl}${expiryText}`;
      await navigator.clipboard.writeText(message);
      toast.success("Invite message copied!");
    } catch {
      toast.error("Failed to copy message");
    }
  };

  const handleComposeEmailInvite = (code: string, expiresAt: string) => {
    try {
      const joinUrl = getJoinUrl(code);
      const subject = encodeURIComponent(`Join our Setlify organization`);
      const expiryText = expiresAt
        ? format(new Date(expiresAt), "MMM d, yyyy 'at' h:mm a")
        : null;
      const body = encodeURIComponent(
        `Hi!\n\nUse this link to join our organization on Setlify:\n${joinUrl}\n\nThe link is single-use${
          expiryText ? ` and expires at ${expiryText}` : ""
        }.\n\nThanks!`
      );
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    } catch {
      toast.error("Failed to open email composer");
    }
  };

  const handleRevokeCode = async (codeId: string) => {
    try {
      await revokeJoinCode(codeId);
    } catch (error) {
      console.error("Failed to revoke invite link:", error);
      toast.error("Failed to revoke invite link");
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

  const statusBuckets = useMemo(() => {
    const buckets: Record<InviteStatus, JoinCode[]> = {
      active: [],
      used: [],
      expired: [],
    };

    joinCodes.forEach((code) => {
      const { status } = getCodeStatus(code);
      buckets[status].push(code);
    });

    return buckets;
  }, [joinCodes]);

  const statusCounts = {
    active: statusBuckets.active.length,
    used: statusBuckets.used.length,
    expired: statusBuckets.expired.length,
  };

  const groupedJoinCodes = useMemo(
    () => {
      if (statusFilter === "all") {
        return STATUS_ORDER.map((status) => ({
          status,
          codes: statusBuckets[status],
        })).filter((group) => group.codes.length > 0);
      }

      const status = statusFilter as InviteStatus;
      return statusBuckets[status].length
        ? [{ status, codes: statusBuckets[status] }]
        : [];
    },
    [statusBuckets, statusFilter]
  );

  const activeCodesCount = statusCounts.active;
  const filterOptions: Array<{
    value: InviteStatus | "all";
    label: string;
    count: number;
  }> = [
    { value: "all", label: "All", count: joinCodes.length },
    { value: "active", label: STATUS_LABELS.active, count: statusCounts.active },
    { value: "used", label: STATUS_LABELS.used, count: statusCounts.used },
    {
      value: "expired",
      label: STATUS_LABELS.expired,
      count: statusCounts.expired,
    },
  ];
  const hasFilteredResults = groupedJoinCodes.length > 0;

  // Check if user is owner (evaluated after hooks to keep consistent order)
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
            Invite Links
          </CardTitle>
          <CardDescription>
            Only organization owners can create or share invite links (single-use
            join codes). Ask an owner to generate one if you need to invite
            someone.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Invite Link Management
          </CardTitle>
          <CardDescription>
            Generate and manage single-use invite links for your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {activeCodesCount}
              </div>
              <div className="text-sm text-muted-foreground">Active Invites</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">
                {statusCounts.used}
              </div>
              <div className="text-sm text-muted-foreground">Used Invites</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{joinCodes.length}</div>
              <div className="text-sm text-muted-foreground">Total Invites</div>
            </div>
          </div>

          {/* Guided invite creation */}
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Step 1 · Select expiration
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 sm:max-w-sm">
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
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Step 2 · Create and share
              </p>
              <Button
                onClick={handleGenerateCode}
                disabled={isGenerating}
                className="w-full sm:w-auto gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <PlusIcon className="h-4 w-4" />
                    Create Invite Link
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Share the invite link with teammates. Each link is a single-use
              join code that expires after the selected time.
            </p>

            {latestInvite && (
              <Alert className="border-primary/40 bg-primary/5">
                <AlertTitle className="flex items-center gap-2 text-base">
                  <LinkIcon className="h-4 w-4 text-primary" />
                  Invite link ready
                </AlertTitle>
                <AlertDescription className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    Share this single-use link now
                    {latestInvite.expiresAt
                      ? ` — expires ${format(
                          new Date(latestInvite.expiresAt),
                          "MMM d, yyyy 'at' h:mm a"
                        )}`
                      : "."}
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1 text-sm font-mono">
                    {latestInvite.code}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
                      className="gap-1"
                      onClick={() => handleCopyUrl(latestInvite.code)}
                    >
                      <CopyIcon className="h-4 w-4" />
                      Copy invite link
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyCodeOnly(latestInvite.code)}
                    >
                      Copy code
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleCopyInviteMessage(
                          latestInvite.code,
                          latestInvite.expiresAt
                        )
                      }
                    >
                      Copy message
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        handleComposeEmailInvite(
                          latestInvite.code,
                          latestInvite.expiresAt
                        )
                      }
                    >
                      Compose email
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invite Links Table */}
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Invite Links</CardTitle>
            <CardDescription>
              Manage every invite link (join code) for your organization
            </CardDescription>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <ToggleGroup
              type="single"
              value={statusFilter}
              onValueChange={(value) => {
                if (!value) return;
                setStatusFilter(value as InviteStatus | "all");
              }}
              className="flex flex-wrap gap-2"
            >
              {filterOptions.map((option) => (
                <ToggleGroupItem
                  key={option.value}
                  value={option.value}
                  aria-label={`Filter ${option.label.toLowerCase()} invites`}
                  className="gap-2 rounded-full px-3 py-1 text-xs font-medium"
                >
                  <span>{option.label}</span>
                  <Badge
                    variant="secondary"
                    className="rounded-full px-2 text-[0.65rem] font-semibold"
                  >
                    {option.count}
                  </Badge>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <Button variant="outline" size="sm" onClick={refreshJoinCodes}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2Icon className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading invite links...</span>
            </div>
          ) : joinCodes.length === 0 ? (
            <div className="text-center py-8">
              <LinkIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <h3 className="font-medium mb-1">No invite links yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first invite link to bring teammates into your org
              </p>
            </div>
          ) : !hasFilteredResults ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No invite links match this filter.
            </div>
          ) : (
            <>
              {/* Mobile stacked list */}
              <div className="md:hidden space-y-5">
                {groupedJoinCodes.map(({ status, codes }) => (
                  <div key={status} className="space-y-3">
                    {statusFilter === "all" && (
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {STATUS_LABELS[status]}
                      </p>
                    )}
                    {codes.map((code) => {
                      const { status: codeStatus, variant } =
                        getCodeStatus(code);
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
                        <div
                          key={code.id}
                          className="rounded-lg border p-4 space-y-3"
                          aria-label={`Invite link ${code.code}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-mono font-semibold text-base">
                              {code.code}
                            </div>
                            <Badge variant={variant} className="capitalize">
                              {codeStatus}
                            </Badge>
                          </div>
                          <DataList className="space-y-2" size="sm">
                            <DataListItem className="justify-between">
                              <DataListLabel>Time Remaining</DataListLabel>
                              <DataListValue>
                                {codeStatus === "active" ? (
                                  <span>
                                    {hoursRemaining}h {minutesRemaining}m
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">
                                    -
                                  </span>
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
                                  <span className="text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </DataListValue>
                            </DataListItem>
                            <DataListItem className="justify-between">
                              <DataListLabel>Used At</DataListLabel>
                              <DataListValue>
                                {code.usedAt ? (
                                  format(new Date(code.usedAt), "MMM d, yyyy")
                                ) : (
                                  <span className="text-muted-foreground">
                                    -
                                  </span>
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
                              Copy Invite Link
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyCodeOnly(code.code)}
                            >
                              Copy Invite Code
                            </Button>
                            {codeStatus === "active" && (
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
                                      Revoke Invite Link
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to revoke this
                                      invite link? This action cannot be undone
                                      and the code will no longer work.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleRevokeCode(code.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Revoke Link
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
                ))}
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
                    {groupedJoinCodes.map(({ status, codes }) => (
                      <Fragment key={status}>
                        {statusFilter === "all" && (
                          <TableRow>
                            <TableCell
                              colSpan={8}
                              className="bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                            >
                              {STATUS_LABELS[status]}
                            </TableCell>
                          </TableRow>
                        )}
                        {codes.map((code) => {
                          const { status: codeStatus, variant } =
                            getCodeStatus(code);
                          const now = new Date();
                          const expiresAt = new Date(code.expiresAt);
                          const msRemaining =
                            expiresAt.getTime() - now.getTime();
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
                                  {codeStatus}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {codeStatus === "active" ? (
                                  <span className="text-sm">
                                    {hoursRemaining}h {minutesRemaining}m
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">
                                    -
                                  </span>
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
                                    <span className="text-sm">
                                      {code.usedBy}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {code.usedAt ? (
                                  format(new Date(code.usedAt), "MMM d, yyyy")
                                ) : (
                                  <span className="text-muted-foreground">
                                    -
                                  </span>
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
                                      Copy Invite Link
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleComposeEmailInvite(
                                          code.code,
                                          code.expiresAt
                                        )
                                      }
                                      className="gap-2"
                                    >
                                      <LinkIcon className="h-4 w-4" />
                                      Compose Email Invite
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleCopyCodeOnly(code.code)
                                      }
                                      className="gap-2"
                                    >
                                      <CopyIcon className="h-4 w-4" />
                                      Copy Invite Code
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleCopyInviteMessage(
                                          code.code,
                                          code.expiresAt
                                        )
                                      }
                                      className="gap-2"
                                    >
                                      <CopyIcon className="h-4 w-4" />
                                      Copy Invite Message
                                    </DropdownMenuItem>
                                    {codeStatus === "active" && (
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <DropdownMenuItem
                                            onSelect={(e) =>
                                              e.preventDefault()
                                            }
                                            className="gap-2 text-destructive focus:text-destructive"
                                          >
                                            <TrashIcon className="h-4 w-4" />
                                            Revoke Link
                                          </DropdownMenuItem>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>
                                              Revoke Invite Link
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Are you sure you want to revoke
                                              this invite link? This action
                                              cannot be undone and the code
                                              will no longer work.
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
                                              Revoke Link
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
                      </Fragment>
                    ))}
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
