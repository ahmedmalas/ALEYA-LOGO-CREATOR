/** Destination for the ALEYA brand/logo control based on auth state. */
export function brandHomePath(signedIn: boolean): "/" | "/dashboard" {
  return signedIn ? "/dashboard" : "/";
}
