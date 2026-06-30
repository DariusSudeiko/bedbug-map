const KEY = 'bb_session'

/**
 * A stable, anonymous per-browser id (random UUID in localStorage). Combined
 * server-side with the request IP + a secret salt to form `reporter_hash`.
 * Not PII — it identifies a browser, not a person.
 */
export function getSessionId(): string {
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(KEY, id)
  }
  return id
}
