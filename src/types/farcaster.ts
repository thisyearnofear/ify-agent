/**
 * Interface for Farcaster user
 */
export interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

/**
 * Interface for Farcaster context
 */
export interface FarcasterContext {
  user?: FarcasterUser;
  client?: {
    clientFid?: number;
    added?: boolean;
  };
  location?: {
    type: string;
    [key: string]: unknown;
  };
  inputImageUrl?: string; // URL of the image being replied to or referenced
}
