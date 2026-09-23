/**
 * Request header carrying the verified auth user id from proxy.ts → server components/actions.
 * proxy.ts ALWAYS overwrites it (even to ''), so a client can never inject a value.
 */
export const AUTH_USER_HEADER = 'x-auth-user-id'
