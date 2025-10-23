import { atom } from "jotai";

export const createRewardEventMutationAtom = atom(() => {
  throw new Error("Rewards feature is only available in Pro version");
});
createRewardEventMutationAtom.debugLabel = "createRewardEventMutationAtom";
