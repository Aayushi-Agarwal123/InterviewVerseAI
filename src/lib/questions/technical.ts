import type { Question } from "@/lib/domain";

export const TECHNICAL: Question[] = [
  {
    id: "dsa-two-sum",
    track: "technical",
    topic: "dsa",
    difficulties: ["warmup", "standard"],
    minutes: 5,
    prompt:
      "Given an array of integers and a target, return the indices of the two numbers that add up to the target. You may not use the same index twice.",
    setup: "Talk about the approach you would ship, not only the nested loops.",
    signals: [
      {
        id: "dsa-two-sum-hash",
        label: "a lookup while you scan",
        hint: "Say what you store as you walk the array, and why that beats checking every pair.",
        patterns: ["hash", "hash map", "hashmap", "dictionary", "lookup"],
      },
      {
        id: "dsa-two-sum-complement",
        label: "the complement before you insert",
        hint: "Name the value you search for, and whether you insert the current number before or after that search.",
        patterns: ["complement", "target minus", "difference", "before inserting", "before I insert"],
      },
      {
        id: "dsa-two-sum-cost",
        label: "time, space, and the empty case",
        hint: "State the complexity and what you return when no pair exists.",
        patterns: ["o(n)", "linear", "one pass", "single pass", "not found", "empty"],
      },
    ],
    followUps: [
      {
        signalId: "dsa-two-sum-complement",
        prompt:
          "Do you check the complement before or after inserting the current value, and why does that order matter for duplicates?",
      },
      {
        signalId: "dsa-two-sum-cost",
        prompt:
          "When would you accept the quadratic scan instead of the extra memory?",
      },
    ],
    outline: [
      "One pass. Map from value to index.",
      "Look up target minus the current value before inserting, so one index is not reused.",
      "O(n) time and O(n) space. Nested loops only when n is small and memory is the tighter budget. Empty input or no pair returns a defined miss.",
    ],
  },
  {
    id: "dsa-cycle",
    track: "technical",
    topic: "dsa",
    difficulties: ["warmup", "standard"],
    minutes: 5,
    prompt:
      "How do you detect a cycle in a singly linked list without using extra memory proportional to the length?",
    setup: "Assume the list may be empty, and a node’s next pointer is the only edge.",
    signals: [
      {
        id: "dsa-cycle-floyd",
        label: "two pointers moving at different speeds",
        hint: "Name the two cursors and how far each moves per step.",
        patterns: ["floyd", "slow", "fast", "two pointer", "tortoise", "hare"],
      },
      {
        id: "dsa-cycle-meet",
        label: "why a meeting point means a cycle",
        hint: "Say what it means if the fast pointer lands on the slow one, and what null means.",
        patterns: ["meet", "same node", "null", "no cycle", "lap"],
      },
      {
        id: "dsa-cycle-cost",
        label: "constant extra memory",
        hint: "Contrast this with a set of seen nodes.",
        patterns: ["o(1)", "constant", "extra memory", "hash set", "seen"],
      },
    ],
    followUps: [
      {
        signalId: "dsa-cycle-floyd",
        prompt: "How do you also find the node where the cycle begins, not only that a cycle exists?",
      },
      {
        signalId: "dsa-cycle-meet",
        prompt: "What do you return for an empty list or a single node with no next?",
      },
    ],
    outline: [
      "Slow moves one step, fast moves two.",
      "If fast reaches null, there is no cycle. If they meet, there is.",
      "Extra memory is O(1). A seen-set also works and uses O(n).",
    ],
  },
  {
    id: "dsa-intervals",
    track: "technical",
    topic: "dsa",
    difficulties: ["warmup", "standard"],
    minutes: 6,
    prompt:
      "You are given meeting intervals. Merge the ones that overlap and return the compact schedule.",
    setup: "Intervals are inclusive. They arrive unsorted.",
    signals: [
      {
        id: "dsa-intervals-sort",
        label: "sort by start time first",
        hint: "Say the order you impose before you merge anything.",
        patterns: ["sort", "start time", "order by start", "sorted"],
      },
      {
        id: "dsa-intervals-merge",
        label: "extend the end when the next start falls inside",
        hint: "Describe the comparison between the current end and the next start.",
        patterns: ["overlap", "end", "merge", "extend", "current"],
      },
      {
        id: "dsa-intervals-cost",
        label: "the sort dominates the cost",
        hint: "Give the complexity after the linear scan.",
        patterns: ["o(n log n)", "n log n", "sort cost", "linear scan"],
      },
    ],
    followUps: [
      {
        signalId: "dsa-intervals-merge",
        prompt: "What changes if touching endpoints, [1,2] and [2,3], should count as one meeting?",
      },
      {
        signalId: "dsa-intervals-sort",
        prompt: "Why is merging unsafe if you skip the sort?",
      },
    ],
    outline: [
      "Sort by start.",
      "Walk once. If the next start is at or before the open end, extend the end. Otherwise close the interval.",
      "Time is O(n log n) from the sort. The merge itself is linear.",
    ],
  },
  {
    id: "dsa-lru",
    track: "technical",
    topic: "dsa",
    difficulties: ["standard", "pressure"],
    minutes: 8,
    prompt:
      "Design an LRU cache with O(1) get and put. Explain the structure, not only the policy name.",
    setup: "Capacity is fixed. On overflow, evict the least recently used key.",
    signals: [
      {
        id: "dsa-lru-map",
        label: "a map for lookup plus an order structure",
        hint: "Name both structures. A map alone does not keep recency in O(1).",
        patterns: ["hash", "hash map", "dictionary", "doubly", "linked list", "order"],
      },
      {
        id: "dsa-lru-move",
        label: "a hit moves the key to most recent",
        hint: "Say what get does to recency, not only what it returns.",
        patterns: ["most recent", "front", "move", "recency", "head"],
      },
      {
        id: "dsa-lru-evict",
        label: "evict the tail when full",
        hint: "Say which end leaves, and that the map and the list stay in sync.",
        patterns: ["evict", "tail", "capacity", "remove", "least recent"],
      },
    ],
    followUps: [
      {
        signalId: "dsa-lru-map",
        prompt: "Why is a singly linked list a poor partner for the map here?",
      },
      {
        signalId: "dsa-lru-evict",
        prompt: "What bug appears if put updates the list but forgets the map, or the reverse?",
      },
    ],
    outline: [
      "Hash map from key to node, plus a doubly linked list from newest to oldest.",
      "Get and put unlink the node and move it to the head.",
      "When size exceeds capacity, drop the tail from both structures. Both operations stay O(1).",
    ],
  },
  {
    id: "dsa-topk",
    track: "technical",
    topic: "dsa",
    difficulties: ["standard", "pressure"],
    minutes: 6,
    prompt:
      "Given a list of words, return the k most frequent. How do you avoid sorting the entire vocabulary if k is small?",
    setup: "Ties can break by count, then by word if you need a stable order.",
    signals: [
      {
        id: "dsa-topk-count",
        label: "a frequency map first",
        hint: "The first pass is counting, before any ordering.",
        patterns: ["frequency", "count", "hash", "hash map", "tally"],
      },
      {
        id: "dsa-topk-heap",
        label: "a bounded heap or quickselect instead of a full sort",
        hint: "Name a structure whose size stays near k.",
        patterns: ["heap", "priority queue", "quickselect", "bounded", "size k"],
      },
      {
        id: "dsa-topk-cost",
        label: "cost in terms of n and k",
        hint: "Compare O(n log k) with sorting every distinct word.",
        patterns: ["o(n log k)", "n log k", "log k", "better than sorting", "n log n"],
      },
    ],
    followUps: [
      {
        signalId: "dsa-topk-heap",
        prompt: "Min-heap or max-heap, and what do you compare when two words share a count?",
      },
      {
        signalId: "dsa-topk-cost",
        prompt: "When is a full sort the simpler choice?",
      },
    ],
    outline: [
      "Count with a map.",
      "Keep a min-heap of size k, or quickselect on the counts.",
      "That is O(n log k) after the count, which wins when k is much smaller than the vocabulary.",
    ],
  },
  {
    id: "dsa-search-answer",
    track: "technical",
    topic: "dsa",
    difficulties: ["standard", "pressure"],
    minutes: 7,
    prompt:
      "You need the minimum ship capacity to deliver all packages on a conveyor in D days, in order. How do you search for that capacity?",
    setup: "Packages cannot be split, and order is fixed.",
    signals: [
      {
        id: "dsa-search-bounds",
        label: "bounds from the heaviest package and the total weight",
        hint: "The answer lives between the max package and the sum.",
        patterns: ["lower bound", "upper bound", "max package", "sum", "between"],
      },
      {
        id: "dsa-search-binary",
        label: "binary search on the capacity",
        hint: "You are not binary searching the package index. Say what the mid value represents.",
        patterns: ["binary search", "mid", "capacity", "search space"],
      },
      {
        id: "dsa-search-check",
        label: "a linear check that a capacity finishes in D days",
        hint: "Describe the greedy day counter that returns yes or no for a candidate capacity.",
        patterns: ["greedy", "days", "feasible", "simulate", "check"],
      },
    ],
    followUps: [
      {
        signalId: "dsa-search-check",
        prompt: "Walk the check: when do you open a new day, and why is the package order required?",
      },
      {
        signalId: "dsa-search-bounds",
        prompt: "What happens to the search if one package is heavier than every capacity you allow?",
      },
    ],
    outline: [
      "Low is the heaviest package. High is the sum.",
      "Binary search the capacity. Mid is a candidate limit.",
      "Greedily pack in order and count days. If days exceed D, search higher. Otherwise search lower.",
    ],
  },
  {
    id: "sd-url",
    track: "technical",
    topic: "system-design",
    difficulties: ["warmup", "standard"],
    minutes: 7,
    prompt: "Design a URL shortener. Start from the read path, because that is the traffic.",
    setup: "Users create a short link. Redirects must be fast. Links can expire.",
    signals: [
      {
        id: "sd-url-key",
        label: "how the short key is generated",
        hint: "Counter, random token, or hash. Mention collisions.",
        patterns: ["base62", "counter", "random", "collision", "id"],
      },
      {
        id: "sd-url-read",
        label: "a cache in front of the lookup",
        hint: "Redirects are read-heavy. Say what you cache and for how long.",
        patterns: ["cache", "redis", "cdn", "read heavy", "redirect"],
      },
      {
        id: "sd-url-fail",
        label: "expiry and a missing key",
        hint: "Say what the redirect service returns when the link is gone.",
        patterns: ["expir", "ttl", "404", "not found", "missing"],
      },
    ],
    followUps: [
      {
        signalId: "sd-url-key",
        prompt: "If two writers generate the same key, what does the create API do?",
      },
      {
        signalId: "sd-url-read",
        prompt: "How do you avoid serving a stale redirect after the owner deletes the link?",
      },
    ],
    outline: [
      "Key is a base62 counter or a random token with a uniqueness check.",
      "Redirect reads a cache first, then the store. Writes are rare compared with reads.",
      "Expiry is a TTL. A miss or a deleted key returns 404, not a guess.",
    ],
  },
  {
    id: "sd-feed",
    track: "technical",
    topic: "system-design",
    difficulties: ["warmup", "standard"],
    minutes: 8,
    prompt:
      "Design the home feed for a social app. A user follows people and should see recent posts quickly.",
    setup: "Celebrity accounts exist. Most users follow a modest number of people.",
    signals: [
      {
        id: "sd-feed-fanout",
        label: "fan-out on write versus fan-out on read",
        hint: "Say which one you use for a normal user, and why a celebrity is different.",
        patterns: ["fan-out", "fanout", "push", "pull", "celebrity", "hybrid"],
      },
      {
        id: "sd-feed-store",
        label: "where the timeline is stored",
        hint: "Name the structure for a user’s precomputed timeline.",
        patterns: ["timeline", "cache", "redis", "ranked", "inbox"],
      },
      {
        id: "sd-feed-rank",
        label: "what you do when the feed is ranked, not only time-ordered",
        hint: "Mention a signal you would rank on, and that ranking can be eventually consistent.",
        patterns: ["rank", "score", "eventual", "freshness", "engagement"],
      },
    ],
    followUps: [
      {
        signalId: "sd-feed-fanout",
        prompt: "What breaks if you push a celebrity post into every follower timeline at write time?",
      },
      {
        signalId: "sd-feed-store",
        prompt: "How does a user who follows nobody, or who has been offline for a month, get a first page?",
      },
    ],
    outline: [
      "Hybrid fan-out. Push for normal accounts, pull celebrities at read time.",
      "A per-user timeline cache holds post ids. The post bodies live separately.",
      "Ranking can lag. The first page must still return quickly if the cache is cold.",
    ],
  },
  {
    id: "sd-limiter",
    track: "technical",
    topic: "system-design",
    difficulties: ["warmup", "standard"],
    minutes: 6,
    prompt:
      "Design a rate limiter for a public API. Clients are identified by API key. Limits are per minute.",
    setup: "The limiter sits in front of many app servers. A client must not get a free pass by hopping instances.",
    signals: [
      {
        id: "sd-limiter-algo",
        label: "an algorithm, not only the word limit",
        hint: "Token bucket, leaky bucket, or a fixed window. Name one and its flaw.",
        patterns: ["token bucket", "leaky", "fixed window", "sliding window", "counter"],
      },
      {
        id: "sd-limiter-shared",
        label: "shared state across instances",
        hint: "A limit that lives in one process memory is not a limit.",
        patterns: ["redis", "shared", "central", "across", "atomic"],
      },
      {
        id: "sd-limiter-client",
        label: "what the client is told when limited",
        hint: "Status code and a hint about when to retry.",
        patterns: ["429", "retry-after", "retry after", "too many"],
      },
    ],
    followUps: [
      {
        signalId: "sd-limiter-algo",
        prompt: "Why does a fixed window let a client burst twice the quota around the boundary?",
      },
      {
        signalId: "sd-limiter-shared",
        prompt: "If the shared store times out, do you fail open or fail closed, and for which routes?",
      },
    ],
    outline: [
      "Sliding window or token bucket, stored per key.",
      "Atomic updates in a shared store so every app instance sees the same count.",
      "Over the limit returns 429 with Retry-After. Decide explicitly whether a store outage fails open.",
    ],
  },
  {
    id: "sd-chat",
    track: "technical",
    topic: "system-design",
    difficulties: ["standard", "pressure"],
    minutes: 8,
    prompt:
      "Design one-to-one chat. Messages must arrive in order, and a recipient who is offline should see them later.",
    setup: "Groups are out of scope. Delivery receipts are in scope.",
    signals: [
      {
        id: "sd-chat-order",
        label: "an order key per conversation",
        hint: "A timestamp from the client clock is not an order.",
        patterns: ["sequence", "monotonic", "per conversation", "order", "cursor"],
      },
      {
        id: "sd-chat-store",
        label: "durable storage plus a live channel",
        hint: "Separate the websocket or long-poll from the source of truth.",
        patterns: ["websocket", "socket", "durable", "database", "inbox", "store"],
      },
      {
        id: "sd-chat-offline",
        label: "offline catch-up",
        hint: "Say how a client asks for messages after a cursor.",
        patterns: ["offline", "catch-up", "catch up", "since", "receipt", "ack"],
      },
    ],
    followUps: [
      {
        signalId: "sd-chat-order",
        prompt: "Two messages are sent a millisecond apart from different devices. How do you order them?",
      },
      {
        signalId: "sd-chat-offline",
        prompt: "What do you persist so ‘delivered’ and ‘read’ survive a server restart?",
      },
    ],
    outline: [
      "Server assigns a monotonic sequence per conversation.",
      "Write to durable storage, then push on the live connection if the recipient is online.",
      "Offline clients sync with ‘after cursor’. Receipts are their own stored events.",
    ],
  },
  {
    id: "sd-notes",
    track: "technical",
    topic: "system-design",
    difficulties: ["standard", "pressure"],
    minutes: 7,
    prompt:
      "Design a notification system that fans one event out to email, push, and in-app. A product team will add a new channel next quarter.",
    setup: "Producers should not know every channel. Duplicates happen.",
    signals: [
      {
        id: "sd-notes-queue",
        label: "a queue between the event and the channels",
        hint: "The API that emits the event should not send the email itself.",
        patterns: ["queue", "topic", "worker", "async", "publish"],
      },
      {
        id: "sd-notes-idem",
        label: "idempotent delivery",
        hint: "Say what key stops a retry from emailing twice.",
        patterns: ["idempoten", "dedup", "duplicate", "once", "retry"],
      },
      {
        id: "sd-notes-pref",
        label: "user preferences before send",
        hint: "A channel worker checks opt-in. The producer does not.",
        patterns: ["preference", "opt", "unsubscribe", "channel"],
      },
    ],
    followUps: [
      {
        signalId: "sd-notes-idem",
        prompt: "A worker crashes after the email provider accepts the message and before it marks success. What happens on retry?",
      },
      {
        signalId: "sd-notes-queue",
        prompt: "How does a new channel ship without a change to every producer?",
      },
    ],
    outline: [
      "Producers publish one event. Channel workers subscribe.",
      "Each send is idempotent on event id plus channel plus user.",
      "Preferences are checked in the worker. A failed channel retries without blocking the others.",
    ],
  },
  {
    id: "sd-files",
    track: "technical",
    topic: "system-design",
    difficulties: ["standard", "pressure"],
    minutes: 7,
    prompt:
      "Design upload and download for user files up to a few gigabytes. The app servers should not proxy the bytes.",
    setup: "You need access control. A shared link should be revocable.",
    signals: [
      {
        id: "sd-files-direct",
        label: "direct-to-storage uploads",
        hint: "The browser should talk to object storage with a scoped grant.",
        patterns: ["presign", "pre-signed", "signed url", "direct", "object storage", "s3"],
      },
      {
        id: "sd-files-meta",
        label: "metadata and authorization live in your service",
        hint: "The bucket is not the source of who may read the file.",
        patterns: ["metadata", "authori", "permission", "owner", "acl"],
      },
      {
        id: "sd-files-chunk",
        label: "multipart or resumable upload",
        hint: "A single POST of a few gigabytes will fail. Say how you resume.",
        patterns: ["multipart", "chunk", "resume", "resumable"],
      },
    ],
    followUps: [
      {
        signalId: "sd-files-direct",
        prompt: "How do you revoke a shared link that was already handed out as a signed URL?",
      },
      {
        signalId: "sd-files-chunk",
        prompt: "What record tells you an upload finished, versus a pile of abandoned parts?",
      },
    ],
    outline: [
      "Issue a short-lived signed upload. Bytes go to object storage.",
      "Your database stores owner, name, and status. Downloads are authorized there, then signed briefly.",
      "Large files use multipart upload. A complete call assembles parts. Abandoned uploads expire.",
    ],
  },
  {
    id: "fe-search",
    track: "technical",
    topic: "frontend",
    difficulties: ["warmup", "standard"],
    minutes: 5,
    prompt:
      "Build a search box that queries as the user types. What do you do so a slow response cannot overwrite a newer one?",
    setup: "The API is eventually consistent and sometimes slow. The input must stay responsive.",
    signals: [
      {
        id: "fe-search-debounce",
        label: "debounce or a similar pause",
        hint: "Say how you avoid a request per keystroke.",
        patterns: ["debounce", "throttle", "pause", "delay"],
      },
      {
        id: "fe-search-race",
        label: "ignore a stale response",
        hint: "A request id, abort controller, or sequence check.",
        patterns: ["abort", "stale", "race", "latest", "sequence", "cancel"],
      },
      {
        id: "fe-search-state",
        label: "empty, loading, and error states",
        hint: "The box has more than a result list. Name the other states.",
        patterns: ["loading", "empty", "error", "no results"],
      },
    ],
    followUps: [
      {
        signalId: "fe-search-race",
        prompt: "Request A returns after request B. Walk through the check that drops A.",
      },
      {
        signalId: "fe-search-debounce",
        prompt: "Why is debounce alone not enough if the user hits Enter during the wait?",
      },
    ],
    outline: [
      "Debounce input, but send immediately on submit.",
      "Abort the previous request or ignore any response that is not the latest id.",
      "Show loading, an empty result, and an error the user can retry without losing the query.",
    ],
  },
  {
    id: "fe-infinite",
    track: "technical",
    topic: "frontend",
    difficulties: ["warmup", "standard"],
    minutes: 6,
    prompt:
      "You are adding infinite scroll to a list of several thousand rows. What fails if you just append forever?",
    setup: "The list is the main surface of the page. Users also jump back to older rows.",
    signals: [
      {
        id: "fe-infinite-window",
        label: "windowing or virtualization",
        hint: "DOM nodes should stay near the viewport, not the full history.",
        patterns: ["virtual", "window", "recycle", "dom node", "viewport"],
      },
      {
        id: "fe-infinite-cursor",
        label: "cursor pagination, not a growing offset",
        hint: "Say how the next page is addressed when rows are inserted above.",
        patterns: ["cursor", "offset", "page", "next page", "duplicate"],
      },
      {
        id: "fe-infinite-end",
        label: "the end and the error while loading more",
        hint: "A spinner that never resolves is a bug. Say the terminal states.",
        patterns: ["end", "no more", "retry", "error", "loading"],
      },
    ],
    followUps: [
      {
        signalId: "fe-infinite-window",
        prompt: "How do you keep scroll position stable when rows above the viewport have variable height?",
      },
      {
        signalId: "fe-infinite-cursor",
        prompt: "What duplicate does a user see if page 2 is fetched twice because the sentinel fired twice?",
      },
    ],
    outline: [
      "Virtualize. Keep a window of rows mounted.",
      "Page with a cursor. Deduplicate by id if a request overlaps.",
      "Stop at the end. A failed page offers retry and does not corrupt the list.",
    ],
  },
  {
    id: "fe-modal",
    track: "technical",
    topic: "frontend",
    difficulties: ["warmup", "standard"],
    minutes: 5,
    prompt:
      "A modal dialog must be usable without a mouse. What do you implement before you call it done?",
    setup: "The page underneath is still in the DOM. Screen reader users are in scope.",
    signals: [
      {
        id: "fe-modal-focus",
        label: "focus moves in and is trapped",
        hint: "Say where focus goes on open, and how Tab behaves.",
        patterns: ["focus", "trap", "tab", "keyboard"],
      },
      {
        id: "fe-modal-escape",
        label: "Escape and a restore of focus",
        hint: "Closing must return focus to the control that opened the dialog.",
        patterns: ["escape", "restore", "return focus", "close"],
      },
      {
        id: "fe-modal-name",
        label: "an accessible name and a hidden background",
        hint: "Mention the dialog role or aria-modal, and inert or aria-hidden on the page.",
        patterns: ["aria", "role", "dialog", "inert", "screen reader", "label"],
      },
    ],
    followUps: [
      {
        signalId: "fe-modal-focus",
        prompt: "What do you do if the dialog’s first control is disabled when it opens?",
      },
      {
        signalId: "fe-modal-name",
        prompt: "Why is a visual overlay not enough for someone who never sees it?",
      },
    ],
    outline: [
      "Move focus into the dialog and keep Tab inside it.",
      "Escape closes. Focus returns to the trigger.",
      "Name the dialog. Mark the rest of the page inert so assistive tech does not wander.",
    ],
  },
  {
    id: "fe-list",
    track: "technical",
    topic: "frontend",
    difficulties: ["standard", "pressure"],
    minutes: 6,
    prompt:
      "A dashboard table re-renders the whole page when one cell edits. How do you find it, and what do you change?",
    setup: "The table is a React view. The edit is local. The rest of the page is expensive.",
    signals: [
      {
        id: "fe-list-profile",
        label: "measure before you memoize",
        hint: "Name a tool or a signal you would look at, not a guess.",
        patterns: ["profiler", "profile", "measure", "why did you render", "commit"],
      },
      {
        id: "fe-list-state",
        label: "state lives at the row, not the page",
        hint: "Say where the editing value is stored so siblings do not subscribe.",
        patterns: ["colocat", "row state", "lift", "local state", "closer"],
      },
      {
        id: "fe-list-memo",
        label: "stable props or memo for the expensive siblings",
        hint: "Memo without stable props does nothing. Mention both.",
        patterns: ["memo", "usecallback", "use memo", "stable", "referential"],
      },
    ],
    followUps: [
      {
        signalId: "fe-list-state",
        prompt: "Give a case where moving state down is the wrong fix.",
      },
      {
        signalId: "fe-list-memo",
        prompt: "Why can React.memo still re-render every row?",
      },
    ],
    outline: [
      "Profile the commit. Confirm the table is the cost.",
      "Keep the draft value in the row that owns the input.",
      "Memoize siblings only after their props are stable. Do not memoize the whole page by reflex.",
    ],
  },
  {
    id: "fe-state",
    track: "technical",
    topic: "frontend",
    difficulties: ["standard", "pressure"],
    minutes: 6,
    prompt:
      "A teammate wants a global store for a multi-step form that nothing else on the site reads. How do you decide where that state lives?",
    setup: "The form is one route. Refreshing can lose it. That is acceptable.",
    signals: [
      {
        id: "fe-state-owner",
        label: "the owner is the smallest tree that needs it",
        hint: "Start from who reads the value, not from a library.",
        patterns: ["closest", "smallest", "who reads", "owner", "colocat", "local"],
      },
      {
        id: "fe-state-server",
        label: "server state is a different problem",
        hint: "Separate data from the server from UI state like the open step.",
        patterns: ["server state", "cache", "query", "ui state", "remote"],
      },
      {
        id: "fe-state-url",
        label: "the URL when the step should be shareable",
        hint: "Say when the step belongs in the query string.",
        patterns: ["url", "query string", "share", "refresh", "route"],
      },
    ],
    followUps: [
      {
        signalId: "fe-state-owner",
        prompt: "What pain appears six months later if every form field is global?",
      },
      {
        signalId: "fe-state-url",
        prompt: "Which fields would you refuse to put in the URL?",
      },
    ],
    outline: [
      "Keep the form state in the route that renders it.",
      "Do not mix fetched entities with the step index in one bucket.",
      "Put the step in the URL only if a refresh or a shared link should reopen it. Leave secrets out.",
    ],
  },
  {
    id: "fe-css",
    track: "technical",
    topic: "frontend",
    difficulties: ["standard", "pressure"],
    minutes: 5,
    prompt:
      "A responsive settings page has a sticky header, a scrolling list, and a footer action. On a short phone the footer covers the last row. How do you lay it out?",
    setup: "No fixed pixel height for the list. The header can wrap to two lines.",
    signals: [
      {
        id: "fe-css-flex",
        label: "the page is a column with a flexible middle",
        hint: "Name the layout mode and which region is allowed to shrink.",
        patterns: ["flex", "grid", "min-height", "minmax", "column", "1fr"],
      },
      {
        id: "fe-css-scroll",
        label: "the list scrolls, not the whole page by accident",
        hint: "Say where overflow is set, and mention min-height zero if you have hit that bug.",
        patterns: ["overflow", "scroll", "min-height: 0", "min-h-0", "min height 0"],
      },
      {
        id: "fe-css-safe",
        label: "the footer stays reachable",
        hint: "Safe area, padding, or a sticky footer that does not cover content.",
        patterns: ["safe area", "padding", "sticky", "footer", "cover"],
      },
    ],
    followUps: [
      {
        signalId: "fe-css-scroll",
        prompt: "Why does a flex child refuse to scroll until you set a minimum size of zero?",
      },
      {
        signalId: "fe-css-safe",
        prompt: "What changes when the mobile browser chrome shows and hides the URL bar?",
      },
    ],
    outline: [
      "Column flex or grid. Header and footer size to content. The middle takes the rest.",
      "Overflow auto on the list, with min-height 0 so it can shrink.",
      "Padding or a safe-area inset so the last row clears the footer and the home indicator.",
    ],
  },
  {
    id: "be-idempotent",
    track: "technical",
    topic: "backend",
    difficulties: ["warmup", "standard"],
    minutes: 6,
    prompt:
      "Design a payment API so a client retry cannot charge the card twice.",
    setup: "The network dies after the bank accepts the charge and before your response reaches the client.",
    signals: [
      {
        id: "be-idem-key",
        label: "an idempotency key from the client",
        hint: "The server cannot invent this after the fact. Say who generates it.",
        patterns: ["idempotency key", "idempotency", "client key", "retry key"],
      },
      {
        id: "be-idem-store",
        label: "store the outcome against that key",
        hint: "A second request must replay the first result, not start a new charge.",
        patterns: ["store", "record", "same response", "replay", "unique"],
      },
      {
        id: "be-idem-race",
        label: "a lock or unique constraint around the in-flight request",
        hint: "Two parallel retries are the real bug, not the polite second click.",
        patterns: ["lock", "unique", "in flight", "in-flight", "concurrent", "race"],
      },
    ],
    followUps: [
      {
        signalId: "be-idem-race",
        prompt: "Both retries pass the ‘no record yet’ check. What constraint stops the second charge?",
      },
      {
        signalId: "be-idem-store",
        prompt: "How long do you keep the key, and what do you return after it expires?",
      },
    ],
    outline: [
      "Client sends an idempotency key per logical payment.",
      "Persist key, request hash, and response. A repeat returns the stored response.",
      "A unique constraint or lock covers the window before the row exists. Expire keys on purpose.",
    ],
  },
  {
    id: "be-page",
    track: "technical",
    topic: "backend",
    difficulties: ["warmup", "standard"],
    minutes: 5,
    prompt:
      "An endpoint returns a user’s activity. Offset pagination gets slow and skips rows. What do you switch to, and why?",
    setup: "New activity is inserted at the top while someone is paging.",
    signals: [
      {
        id: "be-page-cursor",
        label: "cursor or keyset pagination",
        hint: "Name the columns in the cursor. Offset is the thing you are leaving.",
        patterns: ["cursor", "keyset", "seek", "after"],
      },
      {
        id: "be-page-stable",
        label: "a stable sort with a tie break",
        hint: "A timestamp alone collides. Say the extra unique column.",
        patterns: ["tie", "unique", "id", "stable", "order by"],
      },
      {
        id: "be-page-index",
        label: "the index that makes the next page cheap",
        hint: "The where clause and the order must match an index.",
        patterns: ["index", "where", "o(1)", "seek cost", "range"],
      },
    ],
    followUps: [
      {
        signalId: "be-page-cursor",
        prompt: "What does the client send to get the next page, and why is that safer than offset 40?",
      },
      {
        signalId: "be-page-stable",
        prompt: "Two events share a timestamp. Which one appears twice if the tie break is missing?",
      },
    ],
    outline: [
      "Keyset pagination: where (created_at, id) < cursor, order by those columns.",
      "The tie break is a unique id so rows do not repeat or vanish.",
      "The index matches that order. Offset stays only for tiny admin pages.",
    ],
  },
  {
    id: "be-index",
    track: "technical",
    topic: "backend",
    difficulties: ["warmup", "standard"],
    minutes: 6,
    prompt:
      "A query filters by tenant and status and sorts by updated time. It seq-scans as the table grows. How do you index it?",
    setup: "Tenant is highly selective. Status is not. The query always has both.",
    signals: [
      {
        id: "be-index-order",
        label: "column order matches the filter, then the sort",
        hint: "Say which column leads the index and why.",
        patterns: ["tenant", "leading", "leftmost", "composite", "column order"],
      },
      {
        id: "be-index-explain",
        label: "you read a plan, not a hunch",
        hint: "Name explain, a scan type, or rows examined.",
        patterns: ["explain", "plan", "index scan", "seq scan", "rows"],
      },
      {
        id: "be-index-write",
        label: "the write cost of another index",
        hint: "Every index slows inserts. Say why you would not index status alone.",
        patterns: ["write", "insert", "overhead", "selectivity", "low cardinality"],
      },
    ],
    followUps: [
      {
        signalId: "be-index-order",
        prompt: "Why does an index on (status, tenant, updated_at) fail this query’s sort?",
      },
      {
        signalId: "be-index-write",
        prompt: "What do you check a week later to see if the index was worth it?",
      },
    ],
    outline: [
      "Composite index leading with tenant, then status, then updated_at.",
      "Confirm with the query plan that the sort is satisfied by the index.",
      "Skip a status-only index. It is a large, low-selectivity write tax.",
    ],
  },
  {
    id: "be-cache",
    track: "technical",
    topic: "backend",
    difficulties: ["standard", "pressure"],
    minutes: 6,
    prompt:
      "You cache a user’s profile in Redis. After an edit, some requests still see the old name. How do you invalidate?",
    setup: "Several app servers. The database is the source of truth.",
    signals: [
      {
        id: "be-cache-key",
        label: "a key that includes what the value depends on",
        hint: "A bare user id is fine only if every edit deletes it. Mention version or delete.",
        patterns: ["version", "delete", "invalidate", "key", "bust"],
      },
      {
        id: "be-cache-order",
        label: "write the database before you trust the cache",
        hint: "Say the order of the update and the invalidation.",
        patterns: ["database first", "after commit", "write through", "source of truth", "then delete"],
      },
      {
        id: "be-cache-race",
        label: "the race where a reader refills the cache with stale data",
        hint: "A delete is not the end. A slow read can write the old value back.",
        patterns: ["race", "stale", "refill", "stampede", "lock", "ttl"],
      },
    ],
    followUps: [
      {
        signalId: "be-cache-race",
        prompt: "Walk the timeline where request A reads the old row, the update commits, and A then writes the cache.",
      },
      {
        signalId: "be-cache-order",
        prompt: "Why is updating the cache and the database in parallel unsafe?",
      },
    ],
    outline: [
      "Commit the database, then delete the cache key. Or version the key.",
      "Keep a short TTL so a missed delete heals.",
      "Guard the refill. A read that started before the commit must not repopulate the old profile.",
    ],
  },
  {
    id: "be-jobs",
    track: "technical",
    topic: "backend",
    difficulties: ["standard", "pressure"],
    minutes: 6,
    prompt:
      "Sending email and generating a PDF currently happen inside the request that creates an order. The request times out. What do you move, and what do you keep?",
    setup: "The user must know the order exists before they leave the page. The PDF can arrive later.",
    signals: [
      {
        id: "be-jobs-sync",
        label: "the request only does the work the user is waiting on",
        hint: "Persist the order in the request. Name what leaves.",
        patterns: ["persist", "commit", "order row", "response", "synchronous"],
      },
      {
        id: "be-jobs-queue",
        label: "a durable job, not a background thread",
        hint: "A thread in the web process dies with the deploy.",
        patterns: ["queue", "job", "worker", "durable", "outbox"],
      },
      {
        id: "be-jobs-fail",
        label: "retries and a visible failure",
        hint: "Say what the user sees if the PDF still fails after retries.",
        patterns: ["retry", "dead letter", "fail", "status", "idempoten"],
      },
    ],
    followUps: [
      {
        signalId: "be-jobs-queue",
        prompt: "The process crashes after the order commits and before the job is enqueued. How do you close that gap?",
      },
      {
        signalId: "be-jobs-fail",
        prompt: "Why must the PDF job be idempotent?",
      },
    ],
    outline: [
      "Commit the order in the request and return its id.",
      "Enqueue email and PDF via a transactional outbox or a queue write you can reconcile.",
      "Retry with backoff. After the last try, mark the job failed so support can see it. The job key stops duplicates.",
    ],
  },
  {
    id: "be-auth",
    track: "technical",
    topic: "backend",
    difficulties: ["standard", "pressure"],
    minutes: 7,
    prompt:
      "Choose between a server session and a long-lived JWT for a browser app that must be able to sign a user out everywhere.",
    setup: "You have a web app and one first-party API. You do not have a dozen external consumers.",
    signals: [
      {
        id: "be-auth-revoke",
        label: "revocation is the requirement that decides it",
        hint: "A JWT stays valid until expiry unless you add a denylist, which is a session store in disguise.",
        patterns: ["revok", "sign out", "denylist", "deny list", "logout", "everywhere"],
      },
      {
        id: "be-auth-session",
        label: "a server-side session for this product",
        hint: "Say where the session lives and what the cookie holds.",
        patterns: ["session", "cookie", "server", "redis", "httpOnly", "http-only"],
      },
      {
        id: "be-auth-cookie",
        label: "cookie flags, not local storage",
        hint: "Mention HttpOnly, Secure, and SameSite, or why local storage is the wrong place.",
        patterns: ["httponly", "http-only", "samesite", "same-site", "secure", "local storage"],
      },
    ],
    followUps: [
      {
        signalId: "be-auth-revoke",
        prompt: "If you still want a JWT, what extra store do you need before ‘sign out everywhere’ is true?",
      },
      {
        signalId: "be-auth-cookie",
        prompt: "What does SameSite buy you, and what does it not stop?",
      },
    ],
    outline: [
      "Use a server session. Sign-out deletes the row and every device loses access.",
      "The cookie stores an opaque id. HttpOnly, Secure, SameSite.",
      "A long-lived JWT cannot be revoked without a server-side list. That list is a session store.",
    ],
  },
];
