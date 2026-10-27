import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";
import { useMessengerCopy } from "@/lib/messenger-copy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Person = { id: string; name: string };
async function get<T>(url: string): Promise<T> {
  return (await apiRequest("GET", url)).json();
}
function usePeople(me: string, open: boolean, term: string) {
  const { i18n } = useTranslation();
  const contacts = useQuery<{ userId: string; name: string }[]>({
    queryKey: ["messenger", me, "groupContacts", term, i18n.language],
    queryFn: () =>
      get("/api/messenger/contacts?q=" + encodeURIComponent(term) + "&lang=" + i18n.language),
    enabled: open,
  });
  const chats = useQuery<{ kind: string; peerId: string; name: string }[]>({
    queryKey: ["messenger", me, "chats"],
    queryFn: () => get("/api/messenger/conversations"),
    enabled: open,
  });
  const people = Array.from(
    new Map(
      [
        ...(chats.data || [])
          .filter((c) => c.kind === "direct")
          .map((c) => ({ id: c.peerId, name: c.name })),
        ...(contacts.data || []).map((c) => ({ id: c.userId, name: c.name })),
      ]
        .filter((p) => p.id !== me && p.name.toLocaleLowerCase().includes(term.toLocaleLowerCase()))
        .map((p) => [p.id, p]),
    ).values(),
  );
  return {
    people,
    error: contacts.isError || chats.isError,
    loading: contacts.isPending || chats.isPending,
  };
}
export function NewGroup({ me, onCreated }: { me: string; onCreated: (id: string) => void }) {
  const c = useMessengerCopy();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false),
    [title, setTitle] = useState(""),
    [term, setTerm] = useState(""),
    [selected, setSelected] = useState<string[]>([]);
  const { people, error, loading } = usePeople(me, open, term);
  const create = useMutation({
    mutationFn: async () =>
      (await apiRequest("POST", "/api/messenger/groups", { title, userIds: selected })).json(),
    onSuccess: (data) => {
      setOpen(false);
      setTitle("");
      setSelected([]);
      void qc.invalidateQueries({ queryKey: ["messenger", me, "chats"] });
      onCreated(data.id);
    },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" className="w-full mt-2" onClick={() => setOpen(true)}>
        {c.newGroup}
      </Button>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{c.newGroup}</DialogTitle>
          <DialogDescription>{c.groupHint}</DialogDescription>
        </DialogHeader>
        <Input
          aria-label={c.groupName}
          placeholder={c.groupName}
          value={title}
          maxLength={100}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Input
          aria-label={c.search}
          placeholder={c.search}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        {(error || create.isError) && (
          <p role="alert" className="text-destructive">
            {c.error}
          </p>
        )}
        {loading && <p>{c.loading}</p>}
        <div className="max-h-60 overflow-y-auto space-y-2">
          {people.map((p) => (
            <label key={p.id} className="flex gap-3 items-center p-2 rounded border">
              <input
                type="checkbox"
                checked={selected.includes(p.id)}
                disabled={create.isPending || (!selected.includes(p.id) && selected.length >= 19)}
                onChange={() =>
                  setSelected((ids) =>
                    ids.includes(p.id) ? ids.filter((id) => id !== p.id) : [...ids, p.id],
                  )
                }
              />
              <span className="break-words">{p.name}</span>
            </label>
          ))}
        </div>
        <Button
          disabled={!title.trim() || !selected.length || create.isPending}
          onClick={() => create.mutate()}
        >
          {c.createGroup} ({selected.length + 1}/20)
        </Button>
      </DialogContent>
    </Dialog>
  );
}
export function GroupMembers({
  me,
  chat,
  onLeave,
}: {
  me: string;
  chat: { id: string; name: string; creatorId?: string; memberCount?: number };
  onLeave: () => void;
}) {
  const c = useMessengerCopy(),
    qc = useQueryClient();
  const [open, setOpen] = useState(false),
    [term, setTerm] = useState(""),
    [title, setTitle] = useState(chat.name);
  const owner = chat.creatorId === me;
  const base = "/api/messenger/groups/" + chat.id;
  const members = useQuery<Person[]>({
    queryKey: ["messenger", me, chat.id, "members"],
    queryFn: () => get(base + "/members"),
    enabled: open,
    refetchInterval: 10000,
  });
  const people = usePeople(me, open && owner, term);
  const mutate = useMutation({
    mutationFn: async (action: { method: string; path: string; body?: unknown }) => {
      await apiRequest(action.method, action.path, action.body);
      return action;
    },
    onSuccess: (action) => {
      void qc.invalidateQueries({ queryKey: ["messenger", me] });
      if (action.method === "DELETE" && action.path.endsWith("/" + encodeURIComponent(me))) {
        setOpen(false);
        onLeave();
      }
    },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        {c.members} ({chat.memberCount || 0})
      </Button>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{chat.name}</DialogTitle>
          <DialogDescription>{c.groupHint}</DialogDescription>
        </DialogHeader>
        {(members.isError || mutate.isError || people.error) && (
          <p role="alert" className="text-destructive">
            {c.error}
          </p>
        )}
        {owner && (
          <div className="flex gap-2">
            <Input
              aria-label={c.groupName}
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Button
              disabled={!title.trim() || mutate.isPending}
              onClick={() => mutate.mutate({ method: "PATCH", path: base, body: { title } })}
            >
              {c.saveGroup}
            </Button>
          </div>
        )}
        <div className="max-h-60 overflow-y-auto space-y-2">
          {members.data?.map((p) => (
            <div key={p.id} className="flex gap-2 items-center">
              <span className="flex-1 break-words">
                {p.name}
                {p.id === chat.creatorId ? " · " + c.groupAdmin : ""}
              </span>
              {owner && p.id !== me && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={mutate.isPending}
                  onClick={() =>
                    mutate.mutate({
                      method: "DELETE",
                      path: base + "/members/" + encodeURIComponent(p.id),
                    })
                  }
                >
                  {c.removeMember}
                </Button>
              )}
            </div>
          ))}
        </div>
        {owner && (
          <>
            <h3 className="font-medium">{c.addMember}</h3>
            <Input
              aria-label={c.search}
              placeholder={c.search}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
            <div className="max-h-44 overflow-y-auto space-y-2">
              {people.people
                .filter((p) => !members.data?.some((m) => m.id === p.id))
                .map((p) => (
                  <div key={p.id} className="flex gap-2 items-center">
                    <span className="flex-1">{p.name}</span>
                    <Button
                      size="sm"
                      disabled={mutate.isPending || (members.data?.length || 0) >= 20}
                      onClick={() =>
                        mutate.mutate({
                          method: "POST",
                          path: base + "/members",
                          body: { userId: p.id },
                        })
                      }
                    >
                      {c.addMember}
                    </Button>
                  </div>
                ))}
            </div>
          </>
        )}
        {!owner && (
          <Button
            variant="outline"
            disabled={mutate.isPending}
            onClick={() =>
              mutate.mutate({ method: "DELETE", path: base + "/members/" + encodeURIComponent(me) })
            }
          >
            {c.leaveGroup}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
