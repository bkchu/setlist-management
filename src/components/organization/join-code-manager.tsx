import { Fragment, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  useJoinCodes,
  getJoinUrl,
  type JoinCode,
} from "@/hooks/use-join-codes";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  MoreHorizontalIcon,
  PlusIcon,
  Loader2Icon,
  LinkIcon,
  TrashIcon,
  UserIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  MailIcon,
  RefreshCwIcon,
  SparklesIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type InviteStatus = "active" | "used" | "expired";

const STATUS_LABELS: Record<InviteStatus, string> = {
  active: "Active",
  used: "Used",
  expired: "Expired",
};

const STATUS_ORDER: InviteStatus[] = ["active", "used", "expired"];

// Status badge styling based on design.json
function StatusBadge({ status }: { status: InviteStatus }) {
  const styles = {
    active: "bg-primary/15 text-primary border-primary/20",
    used: "bg-white/5 text-muted-foreground border-white/10",
    expired: "bg-destructive/15 text-destructive border-destructive/20",
  };

  const icons = {
    active: <CheckCircleIcon className="h-3 w-3" />,
    used: <UserIcon className="h-3 w-3" />,
    expired: <XCircleIcon className="h-3 w-3" />,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles[status]
      )}
    >
      {icons[status]}
      {STATUS_LABELS[status]}
    </span>
  );
}

// Stat card component
function StatCard({
  value,
  label,
  icon: Icon,
  variant = "default",
}: {
  value: number;
  label: string;
  icon: React.ElementType;
  variant?: "default" | "primary" | "muted";
}) {
  const variantStyles = {
    default: "text-foreground",
    primary: "text-primary",
    muted: "text-muted-foreground",
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]">
      <div className="flex items-start justify-between">
        <div>
          <p className={cn("text-2xl font-bold", variantStyles[variant])}>
            {value}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{label}</p>
        </div>
        <div className="rounded-lg bg-white/5 p-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

// Filter pill button
function FilterPill({
  label,
  count,
  isActive,
  onClick,
}: {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
        isActive
          ? "bg-primary/15 text-primary border border-primary/30"
          : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
      )}
    >
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
          isActive ? "bg-primary/20" : "bg-white/10"
        )}
      >
        {count}
      </span>
    </button>
  );
}

// Invite row for table
function InviteTableRow({
  code,
  status,
  onCopy,
  onCopyCode,
  onEmail,
  onCopyMessage,
  onRevoke,
}: {
  code: JoinCode;
  status: InviteStatus;
  onCopy: () => void;
  onCopyCode: () => void;
  onEmail: () => void;
  onCopyMessage: () => void;
  onRevoke: () => void;
}) {
  const now = new Date();
  const expiresAt = new Date(code.expiresAt);
  const msRemaining = expiresAt.getTime() - now.getTime();
  const hoursRemaining = Math.max(0, Math.floor(msRemaining / (1000 * 60 * 60)));
  const minutesRemaining = Math.max(
    0,
    Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60))
  );

  return (
    <tr className="border-b border-white/5 transition-colors hover:bg-white/[0.02]">
      <td className="py-4 px-4">
        <span className="font-mono text-sm font-medium text-foreground">
          {code.code}
        </span>
      </td>
      <td className="py-4 px-4">
        <StatusBadge status={status} />
      </td>
      <td className="py-4 px-4">
        {status === "active" ? (
          <span className="flex items-center gap-1.5 text-sm text-foreground">
            <ClockIcon className="h-3.5 w-3.5 text-primary" />
            {hoursRemaining}h {minutesRemaining}m
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </td>
      <td className="py-4 px-4">
        <span className="text-sm text-muted-foreground">
          {format(new Date(code.createdAt), "MMM d, h:mm a")}
        </span>
      </td>
      <td className="py-4 px-4">
        <span className="text-sm text-muted-foreground">
          {format(expiresAt, "MMM d, h:mm a")}
        </span>
      </td>
      <td className="py-4 px-4">
        {code.usedBy ? (
          <span className="flex items-center gap-1.5 text-sm">
            <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
            {code.usedBy}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </td>
      <td className="py-4 px-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onCopy} className="gap-2">
              <CopyIcon className="h-4 w-4" />
              Copy link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCopyCode} className="gap-2">
              <LinkIcon className="h-4 w-4" />
              Copy code only
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEmail} className="gap-2">
              <MailIcon className="h-4 w-4" />
              Email invite
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCopyMessage} className="gap-2">
              <CopyIcon className="h-4 w-4" />
              Copy message
            </DropdownMenuItem>
            {status === "active" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="gap-2 text-destructive focus:text-destructive"
                  >
                    <TrashIcon className="h-4 w-4" />
                    Revoke
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Revoke this invite?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This link will stop working immediately. This can't be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onRevoke}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Revoke
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

// Mobile invite card
function InviteMobileCard({
  code,
  status,
  onCopy,
  onCopyCode,
  onRevoke,
}: {
  code: JoinCode;
  status: InviteStatus;
  onCopy: () => void;
  onCopyCode: () => void;
  onRevoke: () => void;
}) {
  const now = new Date();
  const expiresAt = new Date(code.expiresAt);
  const msRemaining = expiresAt.getTime() - now.getTime();
  const hoursRemaining = Math.max(0, Math.floor(msRemaining / (1000 * 60 * 60)));
  const minutesRemaining = Math.max(
    0,
    Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60))
  );

  return (
    <div className="rounded-xl border border-white/10 bg-card/50 p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <span className="font-mono text-base font-semibold text-foreground">
            {code.code}
          </span>
          {status === "active" && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <ClockIcon className="h-3 w-3 text-primary" />
              {hoursRemaining}h {minutesRemaining}m remaining
            </p>
          )}
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-muted-foreground">Expires</p>
          <p className="text-foreground mt-0.5">
            {format(expiresAt, "MMM d, h:mm a")}
          </p>
        </div>
        {code.usedBy && (
          <div>
            <p className="text-muted-foreground">Used by</p>
            <p className="text-foreground mt-0.5 flex items-center gap-1">
              <UserIcon className="h-3 w-3" />
              {code.usedBy}
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onCopy} className="flex-1 gap-1.5">
          <CopyIcon className="h-3.5 w-3.5" />
          Copy link
        </Button>
        <Button variant="ghost" size="sm" onClick={onCopyCode}>
          Code
        </Button>
        {status === "active" && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                <TrashIcon className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Revoke this invite?</AlertDialogTitle>
                <AlertDialogDescription>
                  This link will stop working immediately. This can't be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onRevoke}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Revoke
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}

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
  const [statusFilter, setStatusFilter] = useState<InviteStatus | "all">("all");

  const handleGenerateCode = async () => {
    if (!user?.organizationId) return;

    setIsGenerating(true);
    try {
      const newCode = await generateJoinCode({
        organizationId: user.organizationId,
        expiresInHours: parseInt(expiresInHours),
      });

      setLatestInvite(newCode);
      const joinUrl = getJoinUrl(newCode.code);
      await navigator.clipboard.writeText(joinUrl);
      toast.success("Invite created & copied!", {
        description: "Share the link with your teammate",
      });
    } catch (error) {
      console.error("Failed to generate invite link:", error);
      toast.error("Couldn't create invite", {
        description: "Please try again",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyUrl = async (code: string) => {
    try {
      await navigator.clipboard.writeText(getJoinUrl(code));
      toast.success("Link copied!");
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  const handleCopyCodeOnly = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code copied!");
    } catch {
      toast.error("Couldn't copy code");
    }
  };

  const handleCopyInviteMessage = async (code: string, expiresAt: string) => {
    try {
      const joinUrl = getJoinUrl(code);
      const expiryText = expiresAt
        ? ` (expires ${format(new Date(expiresAt), "MMM d 'at' h:mm a")})`
        : "";
      const message = `Join our Setlify team: ${joinUrl}${expiryText}`;
      await navigator.clipboard.writeText(message);
      toast.success("Message copied!");
    } catch {
      toast.error("Couldn't copy message");
    }
  };

  const handleComposeEmailInvite = (code: string, expiresAt: string) => {
    const joinUrl = getJoinUrl(code);
    const subject = encodeURIComponent("Join our Setlify team");
    const expiryText = expiresAt
      ? format(new Date(expiresAt), "MMM d 'at' h:mm a")
      : null;
    const body = encodeURIComponent(
      `Hi!\n\nJoin our worship team on Setlify:\n${joinUrl}\n\n${
        expiryText ? `This link expires ${expiryText}.` : ""
      }\n\nSee you there!`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleRevokeCode = async (codeId: string) => {
    try {
      await revokeJoinCode(codeId);
      toast.success("Invite revoked");
    } catch {
      toast.error("Couldn't revoke invite");
    }
  };

  const getCodeStatus = (code: JoinCode): InviteStatus => {
    if (code.usedAt) return "used";
    if (new Date(code.expiresAt) < new Date()) return "expired";
    return "active";
  };

  const statusBuckets = useMemo(() => {
    const buckets: Record<InviteStatus, JoinCode[]> = {
      active: [],
      used: [],
      expired: [],
    };
    joinCodes.forEach((code) => {
      buckets[getCodeStatus(code)].push(code);
    });
    return buckets;
  }, [joinCodes]);

  const statusCounts = {
    active: statusBuckets.active.length,
    used: statusBuckets.used.length,
    expired: statusBuckets.expired.length,
  };

  const filteredCodes = useMemo(() => {
    if (statusFilter === "all") {
      return STATUS_ORDER.flatMap((status) =>
        statusBuckets[status].map((code) => ({ code, status }))
      );
    }
    return statusBuckets[statusFilter].map((code) => ({
      code,
      status: statusFilter,
    }));
  }, [statusBuckets, statusFilter]);

  // Check if user is owner
  const isOwner =
    user?.organizations.find(
      (org) => org.organizationId === user.organizationId
    )?.role === "owner";

  if (!isOwner) {
    return (
      <Card className="border-white/10 bg-card/50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-white/5 p-3">
              <LinkIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Invite Links</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Only organization owners can create invite links. Ask an owner if you need to invite someone.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Invite Card */}
      <Card className="border-white/10 bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-xl">
        <CardContent className="p-6">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <StatCard
              value={statusCounts.active}
              label="Active"
              icon={CheckCircleIcon}
              variant="primary"
            />
            <StatCard
              value={statusCounts.used}
              label="Used"
              icon={UserIcon}
              variant="default"
            />
            <StatCard
              value={joinCodes.length}
              label="Total"
              icon={LinkIcon}
              variant="muted"
            />
          </div>

          {/* Create Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 sm:max-w-[200px]">
                <Label htmlFor="expiration" className="text-xs text-muted-foreground mb-1.5 block">
                  Expires in
                </Label>
                <Select value={expiresInHours} onValueChange={setExpiresInHours}>
                  <SelectTrigger id="expiration" className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="6">6 hours</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="72">3 days</SelectItem>
                    <SelectItem value="168">1 week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleGenerateCode}
                  disabled={isGenerating}
                  className="gap-2 w-full sm:w-auto"
                >
                  {isGenerating ? (
                    <>
                      <Loader2Icon className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <PlusIcon className="h-4 w-4" />
                      Create Invite
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Latest invite success banner */}
            {latestInvite && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <SparklesIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">Invite ready!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Expires {format(new Date(latestInvite.expiresAt), "MMM d 'at' h:mm a")}
                    </p>
                  </div>
                  <code className="hidden sm:block rounded-md bg-background/50 px-2 py-1 text-xs font-mono text-foreground">
                    {latestInvite.code}
                  </code>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleCopyUrl(latestInvite.code)}
                    className="gap-1.5"
                  >
                    <CopyIcon className="h-3.5 w-3.5" />
                    Copy link
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleComposeEmailInvite(latestInvite.code, latestInvite.expiresAt)}
                    className="gap-1.5"
                  >
                    <MailIcon className="h-3.5 w-3.5" />
                    Email
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCopyCodeOnly(latestInvite.code)}
                  >
                    Copy code
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invite Links Table Card */}
      <Card className="border-white/10 bg-card/50 backdrop-blur-xl">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border-b border-white/5">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { value: "all" as const, label: "All", count: joinCodes.length },
                { value: "active" as const, label: "Active", count: statusCounts.active },
                { value: "used" as const, label: "Used", count: statusCounts.used },
                { value: "expired" as const, label: "Expired", count: statusCounts.expired },
              ].map((option) => (
                <FilterPill
                  key={option.value}
                  label={option.label}
                  count={option.count}
                  isActive={statusFilter === option.value}
                  onClick={() => setStatusFilter(option.value)}
                />
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshJoinCodes}
              className="gap-1.5 text-muted-foreground"
            >
              <RefreshCwIcon className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : joinCodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="rounded-xl bg-white/5 p-4 mb-4">
                <LinkIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground">No invites yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Create your first invite link to bring teammates into your organization.
              </p>
            </div>
          ) : filteredCodes.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No {statusFilter} invites found.
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02]">
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Code
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Status
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Time Left
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Created
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Expires
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Used By
                      </th>
                      <th className="py-3 px-4 w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCodes.map(({ code, status }) => (
                      <InviteTableRow
                        key={code.id}
                        code={code}
                        status={status}
                        onCopy={() => handleCopyUrl(code.code)}
                        onCopyCode={() => handleCopyCodeOnly(code.code)}
                        onEmail={() => handleComposeEmailInvite(code.code, code.expiresAt)}
                        onCopyMessage={() => handleCopyInviteMessage(code.code, code.expiresAt)}
                        onRevoke={() => handleRevokeCode(code.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden p-4 space-y-3">
                {filteredCodes.map(({ code, status }) => (
                  <InviteMobileCard
                    key={code.id}
                    code={code}
                    status={status}
                    onCopy={() => handleCopyUrl(code.code)}
                    onCopyCode={() => handleCopyCodeOnly(code.code)}
                    onRevoke={() => handleRevokeCode(code.id)}
                  />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
