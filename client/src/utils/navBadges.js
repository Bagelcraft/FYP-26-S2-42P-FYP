// Tracks which nav tabs have unseen activity.
//
// The server reports how many items on each tab currently need attention. We
// remember, per user, how many were on screen the last time they opened that tab,
// and only raise the dot when the count has GROWN since then. So:
//
//   3 pending leave requests, never visited  -> dot shows "3"
//   user opens /pm/leave                     -> dot clears (seen = 3)
//   a 4th request arrives                    -> dot shows "4"
//   two get approved (count 2)               -> stays clear, and seen drops to 2
//                                               so the next new one re-triggers
//
// Kept in localStorage rather than the database: it is per-person, per-device UI
// state, and losing it costs nothing worse than one extra dot.

const key = (userId) => `navSeen:${userId ?? 'anon'}`;

export function readSeen(userId) {
  try {
    const raw = localStorage.getItem(key(userId));
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {}; // corrupt or unavailable storage — treat everything as unseen
  }
}

function writeSeen(userId, seen) {
  try {
    localStorage.setItem(key(userId), JSON.stringify(seen));
  } catch {
    /* private mode / quota — badges just won't persist */
  }
}

/** Mark a tab as read: the user is looking at it right now. */
export function markSeen(userId, path, count) {
  const seen = readSeen(userId);
  if (seen[path] === count) return seen;
  const next = { ...seen, [path]: count };
  writeSeen(userId, next);
  return next;
}

/**
 * Clamp remembered counts that now exceed the live count. Without this, resolving
 * items would leave `seen` stranded above `count` and suppress the dot for
 * genuinely new arrivals.
 */
export function reconcile(userId, counts) {
  const seen = readSeen(userId);
  let changed = false;

  for (const [path, count] of Object.entries(counts)) {
    if ((seen[path] ?? 0) > count) {
      seen[path] = count;
      changed = true;
    }
  }

  if (changed) writeSeen(userId, seen);
  return seen;
}

/** How many unseen items to show on this tab (0 = no dot). */
export function unseenCount(counts, seen, path) {
  const count = counts[path] ?? 0;
  return count > (seen[path] ?? 0) ? count : 0;
}
