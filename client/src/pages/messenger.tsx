import { NewGroup, GroupMembers } from "@/components/messenger-groups";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import { MessageCircle, ArrowLeft, Send, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useMessengerCopy } from "@/lib/messenger-copy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { BackButton } from "@/components/back-button";
import { LanguageSwitcher } from "@/components/language-switcher";

type Chat = {
  kind?: "direct" | "group";
  creatorId?: string;
  memberCount?: number;
  id: string;
  peerId: string;
  name: string;
  avatar: string | null;
  preview: string | null;
  unread: number;
  blocked: boolean;
};
type Message = {
  id: number;
  senderId: string;
  senderName?: string;
  clientId: string;
  body: string;
  createdAt: string;
  attachment?: { id: string; name: string; contentType: string; size: number } | null;
};
type History = { messages: Message[]; hasMore: boolean; peerReadId: number };
type Contact = {
  id: string;
  userId: string;
  kind: "master" | "salon";
  name: string;
  avatar: string | null;
};
async function get<T>(url: string): Promise<T> {
  return (await apiRequest("GET", url)).json();
}
function Face({ name, avatar }: { name: string; avatar?: string | null }) {
  return (
    <Avatar className="h-10 w-10 shrink-0">
      <AvatarImage src={avatar || undefined} alt={name} />
      <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

export default function MessengerPage() {
  const { user, isLoading } = useAuth();
  const c = useMessengerCopy();
  const { i18n } = useTranslation();
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const selected = params.get("chat");
  const recipient = params.get("to");
  const [chatSearch, setChatSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const qc = useQueryClient();
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term), 300);
    return () => clearTimeout(timer);
  }, [term]);
  const chats = useQuery<Chat[]>({
    queryKey: ["messenger", user?.id, "chats"],
    queryFn: () => get("/api/messenger/conversations"),
    enabled: !!user,
    refetchInterval: 5000,
  });
  const contacts = useQuery<Contact[]>({
    queryKey: ["messenger", user?.id, "contacts", debounced, i18n.language],
    queryFn: () =>
      get(`/api/messenger/contacts?q=${encodeURIComponent(debounced)}&lang=${i18n.language}`),
    enabled: !!user && creating,
  });
  const start = useMutation({
    mutationFn: async (userId: string) =>
      (await apiRequest("POST", "/api/messenger/conversations", { userId })).json(),
    onSuccess: (data) => {
      setCreating(false);
      navigate(`/messenger?chat=${encodeURIComponent(data.id)}`, { replace: !!recipient });
      void qc.invalidateQueries({ queryKey: ["messenger", user?.id, "chats"] });
    },
  });
  const attempted = useRef("");
  useEffect(() => {
    if (user && recipient && attempted.current !== `${user.id}:${recipient}`) {
      attempted.current = `${user.id}:${recipient}`;
      start.mutate(recipient);
    }
  }, [user?.id, recipient]);
  const chat = chats.data?.find((x) => x.id === selected);
  if (isLoading) return <main className="p-8">{c.loading}</main>;
  if (!user)
    return (
      <main className="p-8 space-y-4">
        <h1>{c.login}</h1>
        <Button
          onClick={() => {
            sessionStorage.setItem(
              "redirectAfterLogin",
              "/messenger" + (search ? "?" + search : ""),
            );
            navigate("/auth");
          }}
        >
          {c.signIn}
        </Button>
      </main>
    );
  return (
    <main className="h-[100dvh] flex flex-col bg-background">
      <header className="flex items-center gap-3 border-b px-4 py-3 shrink-0 bg-card">
        <BackButton />
        <MessageCircle className="text-primary" />
        <h1 className="text-xl font-semibold flex-1">{c.title}</h1>
        <LanguageSwitcher />
      </header>
      <div className="flex flex-1 min-h-0 w-full max-w-[1440px] mx-auto border-x">
        <aside
          className={`${selected && !creating ? "hidden md:flex" : "flex"} flex-col w-full md:w-80 shrink-0 border-r min-h-0 bg-card/60`}
        >
          <div className="p-3">
            <Button
              className="w-full"
              onClick={() => {
                setCreating(!creating);
                start.reset();
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              {c.newChat}
            </Button>
            <NewGroup
              me={user.id}
              onCreated={(id) => {
                setCreating(false);
                navigate(`/messenger?chat=${id}`);
              }}
            />
          </div>
          {!creating && <div className="px-3 pb-3"><Input aria-label={c.searchChats} placeholder={c.searchChats} value={chatSearch} onChange={(e) => setChatSearch(e.target.value)} /></div>}
          {creating && (
            <div className="px-3 pb-3 space-y-2">
              <Input
                aria-label={c.search}
                placeholder={c.search}
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{c.directory}</p>
              <label className="block text-xs text-muted-foreground" htmlFor="messenger-invite">
                {c.invite}
              </label>
              <Input
                id="messenger-invite"
                readOnly
                value={`${window.location.origin}/messenger?to=${encodeURIComponent(user.id)}`}
                onFocus={(e) => e.target.select()}
                className="text-xs"
              />
            </div>
          )}
          {start.isError && (
            <p role="alert" className="p-3 text-destructive">
              {c.error}
              {recipient && <Button onClick={() => start.mutate(recipient)}>{c.retry}</Button>}
            </p>
          )}
          <div className="overflow-y-auto flex-1">
            {(creating ? contacts : chats).isPending && <p className="p-4">{c.loading}</p>}
            {(creating ? contacts : chats).isError && (
              <div role="alert" className="p-4">
                {c.error}
                <Button
                  variant="outline"
                  onClick={() => void (creating ? contacts : chats).refetch()}
                >
                  {c.retry}
                </Button>
              </div>
            )}
            {creating
              ? contacts.data?.map((p) => (
                  <button
                    key={`${p.kind}:${p.id}`}
                    disabled={start.isPending}
                    onClick={() => start.mutate(p.userId)}
                    className="flex gap-3 w-full p-4 text-left hover:bg-muted"
                  >
                    <Face {...p} />
                    <span className="min-w-0">
                      <span className="block font-medium break-words">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{c[p.kind]}</span>
                    </span>
                  </button>
                ))
              : chats.data?.filter((p) => p.name.toLocaleLowerCase().includes(chatSearch.toLocaleLowerCase())).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/messenger?chat=${p.id}`)}
                    aria-current={selected === p.id ? "page" : undefined}
                    className={`flex gap-3 w-full p-4 text-left border-l-[3px] transition-colors ${selected === p.id ? "bg-primary/10 border-l-primary" : "border-l-transparent hover:bg-muted/50"}`}
                  >
                    <Face {...p} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium truncate">{p.name}</span>
                      <span className="block text-sm text-muted-foreground truncate">
                        {p.preview || c.first}
                      </span>
                    </span>
                    {p.unread > 0 && (
                      <span className="rounded-full bg-primary text-primary-foreground text-xs px-2 py-1 h-fit">
                        {p.unread}
                      </span>
                    )}
                  </button>
                ))}
            {(creating ? contacts.data : chats.data)?.length === 0 && (
              <p className="p-5 text-muted-foreground">{creating ? c.noResults : c.empty}</p>
            )}
          </div>
        </aside>
        <section
          className={`${!selected || creating ? "hidden md:flex" : "flex"} flex-col flex-1 min-w-0 min-h-0`}
        >
          {chat && !creating ? (
            <Conversation
              key={`${user.id}:${chat.id}`}
              chat={chat}
              me={user.id}
              draft={drafts[chat.id] || ""}
              setDraft={(value) => setDrafts((d) => ({ ...d, [chat.id]: value }))}
            />
          ) : (
            <div className="m-auto p-8 text-center text-muted-foreground">
              <MessageCircle className="mx-auto mb-4 h-12 w-12" />
              {c.choose}
              {selected && (
                <Button
                  className="block mx-auto mt-4"
                  variant="outline"
                  onClick={() => navigate("/messenger")}
                >
                  {c.back}
                </Button>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Conversation({
  chat,
  me,
  draft,
  setDraft,
}: {
  chat: Chat;
  me: string;
  draft: string;
  setDraft: (v: string) => void;
}) {
  const c = useMessengerCopy();
  const { i18n } = useTranslation();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const base = `/api/messenger/conversations/${chat.id}`;
  const history = useQuery<History>({
    queryKey: ["messenger", me, chat.id, "messages"],
    queryFn: () => get(base + "/messages"),
    refetchInterval: 5000,
  });
  const [older, setOlder] = useState<Message[]>([]);
  const [more, setMore] = useState<boolean | null>(null);
  const [readError, setReadError] = useState(false);
  const readCursor = useRef(0);
  const viewport = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const messages = Array.from(
    new Map([...older, ...(history.data?.messages || [])].map((m) => [m.id, m])).values(),
  ).sort((a, b) => a.id - b.id);
  // Keep loaded history when the latest 50-message window advances.
  useEffect(() => {
    if (history.data)
      setOlder((old) =>
        Array.from(new Map([...old, ...history.data.messages].map((m) => [m.id, m])).values()),
      );
  }, [history.data]);
  const last = messages.at(-1)?.id;
  useEffect(() => {
    if (stick.current && viewport.current)
      viewport.current.scrollTop = viewport.current.scrollHeight;
  }, [last]);
  useEffect(() => {
    const mark = () => {
      if (
        !last ||
        !stick.current ||
        document.visibilityState !== "visible" ||
        !document.hasFocus() ||
        readCursor.current >= last
      )
        return;
      readCursor.current = last;
      void apiRequest("POST", base + "/read", { messageId: last })
        .then(() => {
          setReadError(false);
          void qc.invalidateQueries({ queryKey: ["messenger", me, "chats"] });
        })
        .catch(() => {
          readCursor.current = 0;
          setReadError(true);
        });
    };
    mark();
    window.addEventListener("focus", mark);
    document.addEventListener("visibilitychange", mark);
    const timer = setInterval(mark, 5000);
    return () => {
      window.removeEventListener("focus", mark);
      document.removeEventListener("visibilitychange", mark);
      clearInterval(timer);
    };
  }, [last, base, me, qc]);
  const page = useMutation({
    mutationFn: () => get<History>(base + "/messages?before=" + messages[0]?.id),
    onSuccess: (data) => {
      setOlder((old) => [...data.messages, ...old]);
      setMore(data.hasMore);
    },
  });
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!file?.type.startsWith("image/")) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const fileInput = useRef<HTMLInputElement>(null);
  const pending = useRef<{ body: string; clientId: string; file: File | null } | null>(null);
  const send = useMutation({
    mutationFn: async () => {
      const body = draft.trim();
      if (!pending.current || pending.current.body !== body || pending.current.file !== file)
        pending.current = { body, clientId: crypto.randomUUID(), file };
      const payload = pending.current;
      if (file) {
        const form = new FormData();
        form.append("body", body);
        form.append("clientId", payload.clientId);
        form.append("file", file);
        await apiRequest("POST", base + "/messages", form);
      } else await apiRequest("POST", base + "/messages", { body, clientId: payload.clientId });
      return payload;
    },
    onSuccess: (payload) => {
      if (draft.trim() === payload.body) setDraft("");
      pending.current = null;
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      stick.current = true;
      void qc.invalidateQueries({ queryKey: ["messenger", me] });
    },
  });
  const block = useMutation({
    mutationFn: () => apiRequest("PUT", base + "/block", { blocked: !chat.blocked }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["messenger", me, "chats"] });
    },
  });
  const blockedError = (send.error as { code?: string })?.code === "MESSENGER_BLOCKED";
  return (
    <>
      <header className="p-3 border-b flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label={c.back}
          onClick={() => navigate("/messenger")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Face {...chat} />
        <div className="min-w-0 flex-1"><h2 className="font-semibold truncate">{chat.name}</h2><p className="text-xs text-muted-foreground">{chat.kind === "group" ? `${c.members}: ${chat.memberCount}` : c.directChat}</p></div>
        {chat.kind === "group" ? (
          <GroupMembers me={me} chat={chat} onLeave={() => navigate("/messenger")} />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            disabled={block.isPending}
            onClick={() => block.mutate()}
          >
            {chat.blocked ? c.unblock : c.block}
          </Button>
        )}
      </header>
      <div
        ref={viewport}
        onScroll={() => {
          const e = viewport.current;
          if (e) stick.current = e.scrollHeight - e.scrollTop - e.clientHeight < 100;
        }}
        className="flex-1 min-h-0 overflow-y-auto p-4 md:px-8 space-y-3 bg-muted/10"
        aria-label={c.title}
      >
        {history.isPending && <p>{c.loading}</p>}
        {(history.isError || page.isError || block.isError || readError) && (
          <div role="alert">
            {c.error}
            <Button onClick={() => void history.refetch()} variant="outline">
              {c.retry}
            </Button>
          </div>
        )}
        {(more ?? history.data?.hasMore) && (
          <Button
            variant="ghost"
            className="mx-auto block"
            disabled={page.isPending}
            onClick={() => page.mutate()}
          >
            {c.older}
          </Button>
        )}
        {messages.map((m) => (
          <article
            key={m.id}
            className={`rounded-2xl p-3 w-fit max-w-[88%] md:max-w-[75%] ${m.senderId === me ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            {chat.kind === "group" && <p className="text-xs font-semibold mb-1">{m.senderName}</p>}
            <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{m.body}</p>
            {m.attachment && (
              <a
                className="block mt-2 underline break-all"
                href={"/api/messenger/attachments/" + m.attachment.id}
                target="_blank"
                rel="noopener noreferrer"
              >
                {m.attachment.contentType === "image/webp" && (
                  <img
                    src={"/api/messenger/attachments/" + m.attachment.id}
                    alt={m.attachment.name}
                    loading="lazy"
                    className="max-h-64 max-w-full rounded-lg"
                  />
                )}
                {m.attachment.name} · {Math.ceil(m.attachment.size / 1024)} KB
              </a>
            )}
            <div className="text-[11px] mt-1 opacity-75 text-right">
              <time dateTime={m.createdAt}>
                {new Date(m.createdAt).toLocaleString(i18n.language, {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
              {m.senderId === me && (
                <span className="ml-2">
                  {(history.data?.peerReadId || 0) >= m.id ? c.read : c.sent}
                </span>
              )}
            </div>
          </article>
        ))}
        {!history.isPending && !history.isError && !messages.length && (
          <p className="text-center text-muted-foreground">{c.first}</p>
        )}
      </div>
      <form
        className="bg-card border-t p-3 md:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          if ((draft.trim() || file) && !send.isPending && !chat.blocked) send.mutate();
        }}
      >
        <input
          ref={fileInput}
          type="file"
          className="sr-only"
          aria-label={c.attach}
          accept="image/jpeg,image/png,image/webp,application/pdf"
          disabled={send.isPending || chat.blocked}
          onChange={(e) => {
            const selected = e.target.files?.[0];
            if (!selected) return;
            if (
              selected.size > 8 * 1024 * 1024 ||
              selected.size === 0 ||
              !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(selected.type)
            ) {
              setFileError(true);
              setFile(null);
              e.target.value = "";
              return;
            }
            setFileError(false);
            setFile(selected);
          }}
        />
        <div className="flex items-center gap-2 text-xs">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={send.isPending || chat.blocked}
            onClick={() => fileInput.current?.click()}
          >
            {c.attach}
          </Button>
          <span className="text-muted-foreground">{c.fileTypes}</span>
        </div>
        {preview && (
          <img
            src={preview}
            alt={file?.name}
            className="h-24 max-w-full object-contain rounded-lg"
          />
        )}
        {file && (
          <div className="flex items-center gap-2 text-sm">
            <span className="truncate flex-1">{file.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={send.isPending}
              onClick={() => {
                setFile(null);
                if (fileInput.current) fileInput.current.value = "";
              }}
            >
              {c.removeFile}
            </Button>
          </div>
        )}
        {(fileError || (send.error as { code?: string })?.code === "MESSENGER_INVALID_FILE") && (
          <p role="alert" className="text-sm text-destructive">
            {c.fileError}
          </p>
        )}
        {(send.isError || chat.blocked) && (
          <p role="alert" className="text-sm text-destructive">
            {blockedError || chat.blocked ? c.blocked : c.sendError}
          </p>
        )}
        <div className="flex gap-2 items-end">
          <Textarea
            aria-label={c.message}
            placeholder={c.message}
            value={draft}
            maxLength={4000}
            disabled={chat.blocked || send.isPending}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) {
                e.preventDefault();
                if ((draft.trim() || file) && !send.isPending && !chat.blocked) send.mutate();
              }
            }}
            className="min-h-12 max-h-40 resize-none"
          />
          <Button
            type="submit"
            disabled={(!draft.trim() && !file) || send.isPending || chat.blocked}
            aria-label={c.send}
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">{send.isPending ? c.sending : c.send}</span>
          </Button>
        </div>
      </form>
    </>
  );
}
