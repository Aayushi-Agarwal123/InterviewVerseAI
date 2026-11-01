export type AvatarInterviewer = "arun" | "leela" | "mixed";

export type AvatarVisualState = "idle" | "speaking" | "listening" | "thinking";

/**
 * Built-in interviewer art. Mouth movement is a CSS animation while speech
 * synthesis is speaking. It is not phoneme lip-sync and it is not a video model.
 *
 * A paid streaming avatar (Simli, HeyGen, or D-ID) is not connected. Those
 * services bill per minute of generated video and need their own key. A future
 * provider would implement AvatarRenderer and stay behind this module so the
 * interview engine does not import a vendor SDK.
 */
export type AvatarProviderId = "illustrated";

export type AvatarProvider = {
  id: AvatarProviderId;
  lipSync: false;
  paid: false;
  label: string;
  limitation: string;
};

export const ILLUSTRATED_AVATAR: AvatarProvider = {
  id: "illustrated",
  lipSync: false,
  paid: false,
  label: "Illustrated interviewer",
  limitation:
    "Speech uses the browser voice. The mouth animates while that voice is speaking. There is no real-time lip-sync and no third-party video avatar.",
};
