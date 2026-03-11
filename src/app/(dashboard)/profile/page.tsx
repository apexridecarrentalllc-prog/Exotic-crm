"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/ui/Avatar";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

type MeProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
};

type ActivityEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress: string | null;
  createdAt: string;
};

async function fetchMe(): Promise<MeProfile> {
  const res = await fetch("/api/users/me");
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
}

async function fetchMyActivity(userId: string, page: number): Promise<{
  data: ActivityEntry[];
  total: number;
  totalPages: number;
}> {
  const res = await fetch(`/api/users/${userId}/activity?page=${page}&limit=10`);
  if (!res.ok) return { data: [], total: 0, totalPages: 0 };
  const json = await res.json();
  return { data: json.data ?? [], total: json.total ?? 0, totalPages: json.totalPages ?? 0 };
}

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [activityPage, setActivityPage] = useState(1);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["users", "me"],
    queryFn: fetchMe,
  });

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ["users", "me", "activity", user?.id, activityPage],
    queryFn: () => fetchMyActivity(user!.id, activityPage),
    enabled: !!user?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message ?? "Failed to update");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users", "me"] });
      toast.success("Profile updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        setPasswordError("Passwords do not match");
        throw new Error("Passwords do not match");
      }
      if (newPassword.length < 8) {
        setPasswordError("New password must be at least 8 characters");
        throw new Error("New password must be at least 8 characters");
      }
      setPasswordError("");
      const res = await fetch("/api/users/me/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.message ?? "Failed to change password");
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
      toast.success("Password changed");
    },
    onError: (e: Error) => {
      if (e.message !== "Passwords do not match" && e.message !== "New password must be at least 8 characters") {
        setPasswordError(e.message);
      }
      toast.error(e.message);
    },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    changePasswordMutation.mutate();
  };

  useEffect(() => {
    if (profile?.name) setName(profile.name);
  }, [profile?.name]);

  if (profileLoading || !profile) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" subtitle="Your account details and activity" />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personal details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar
                name={profile.name}
                src={profile.avatar ?? undefined}
                className="h-16 w-16"
              />
              <div>
                <p className="font-medium">{profile.name}</p>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {profile.role.replace(/_/g, " ")}
                </p>
              </div>
            </div>
            <div>
              <Label htmlFor="profile-name">Full Name</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground mt-1">{profile.email}</p>
              <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
            </div>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending || name === profile.name}
            >
              {updateMutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1"
                  minLength={8}
                  required
                />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}
              <Button
                type="submit"
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending ? "Updating…" : "Change password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>My activity log</CardTitle>
          <p className="text-sm text-muted-foreground font-normal">
            Recent actions you performed
          </p>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !activity?.data?.length ? (
            <p className="text-sm text-muted-foreground py-4">No activity yet.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Date / Time</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity Type</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activity.data.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>{log.entityType}</TableCell>
                      <TableCell className="font-mono text-xs truncate max-w-[100px]">
                        {log.entityId}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {log.ipAddress ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {activity.totalPages > 1 && (
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={activityPage <= 1}
                    onClick={() => setActivityPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground self-center">
                    Page {activityPage} of {activity.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={activityPage >= activity.totalPages}
                    onClick={() => setActivityPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
