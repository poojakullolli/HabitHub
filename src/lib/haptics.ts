// Lightweight haptic helper. Uses Capacitor Haptics on native, falls back to web Vibration API.
import { Haptics, ImpactStyle } from "@capacitor/haptics";

export const tapHaptic = async () => {
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(10);
    }
  }
};

export const successHaptic = async () => {
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.([8, 30, 14]);
    }
  }
};

/** Stronger celebratory haptic — fired when an entire routine is completed. */
export const completionHaptic = async () => {
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
    setTimeout(() => Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {}), 90);
    setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {}), 200);
  } catch {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.([18, 40, 22, 40, 32]);
    }
  }
};
