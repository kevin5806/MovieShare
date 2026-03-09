import { saveProfileAction } from "@/features/profile/actions";
import { FriendshipPanel } from "@/components/profile/friendship-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireSession } from "@/server/session";
import { getProfileOverview } from "@/server/services/profile-service";

export default async function ProfilePage() {
  const session = await requireSession();
  const user = await getProfileOverview(session.user.id);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <Badge variant="secondary">{session.user.role}</Badge>
        <h1 className="text-4xl font-semibold tracking-tight">Profile</h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground">
          Keep a lightweight public profile for collaborators and future selection heuristics.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle>Basic profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={saveProfileAction} className="space-y-4">
              <Input name="displayName" defaultValue={user?.profile?.displayName ?? ""} placeholder="Display name" />
              <Input name="location" defaultValue={user?.profile?.location ?? ""} placeholder="Location" />
              <Input
                name="favoriteGenres"
                defaultValue={user?.profile?.favoriteGenres.join(", ") ?? ""}
                placeholder="Favorite genres, comma separated"
              />
              <Textarea
                name="bio"
                defaultValue={user?.profile?.bio ?? ""}
                placeholder="Short bio or movie vibe"
              />
              <Button type="submit">Save profile</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle>Account snapshot</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-3xl border border-border/70 bg-background p-4">
              <p className="text-sm text-muted-foreground">Lists joined</p>
              <p className="mt-2 text-3xl font-semibold">{user?._count.listMemberships ?? 0}</p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-background p-4">
              <p className="text-sm text-muted-foreground">Feedback entries</p>
              <p className="mt-2 text-3xl font-semibold">{user?._count.feedbacks ?? 0}</p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-background p-4">
              <p className="text-sm text-muted-foreground">Watch sessions</p>
              <p className="mt-2 text-3xl font-semibold">
                {user?._count.watchSessionMembers ?? 0}
              </p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-background p-4">
              <p className="text-sm text-muted-foreground">Friends</p>
              <p className="mt-2 text-3xl font-semibold">{user?.friends.length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {user ? (
        <FriendshipPanel
          friends={user.friends.map((friend) => ({
            id: friend.id,
            name: friend.name,
            displayName: friend.profile?.displayName,
            email: friend.email,
          }))}
          incomingInvites={user.receivedFriendInvites.map((invite) => ({
            id: invite.id,
            senderName: invite.sender.name,
            senderDisplayName: invite.sender.profile?.displayName,
            senderEmail: invite.sender.email,
            message: invite.message,
            createdAt: invite.createdAt.toISOString(),
          }))}
          outgoingInvites={user.sentFriendInvites.map((invite) => ({
            id: invite.id,
            receiverName: invite.receiver.name,
            receiverDisplayName: invite.receiver.profile?.displayName,
            receiverEmail: invite.receiver.email,
            createdAt: invite.createdAt.toISOString(),
          }))}
        />
      ) : null}
    </div>
  );
}
