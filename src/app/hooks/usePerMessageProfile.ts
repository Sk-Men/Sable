import { MatrixClient } from 'matrix-js-sdk';

/**
 * a per message profile
 */
export type PerMessageProfile = {
  /**
   * a unique id for this profile, can be generated using something like nanoid.
   * This is used to identify the profile when applying it to a message, and also used as the key when storing the profile in account data.
   */
  id: string;
  /**
   * the display name to use for messages using this profile.
   * This is required because otherwise the profile would have no effect on the message.
   */
  name: string;
  /**
   * the avatar url to use for messages using this profile.
   */
  avatarUrl?: string;
};

type PerMessageProfileIndex = {
  /**
   * a list of all profile ids, used to list all profiles when the user wants to manage them.
   */
  profileIds: string[];
};

export function getPerMessageProfileById(
  mx: MatrixClient,
  id: string
): PerMessageProfile | undefined {
  const profile = mx.getAccountData(`fyi.cisnt.permessageprofile.${id}` as any);
  return profile ? (profile as unknown as PerMessageProfile) : undefined;
}

export function getAllPerMessageProfiles(mx: MatrixClient): PerMessageProfile[] {
  const profileData = mx.getAccountData('fyi.cisnt.permessageprofile.index' as any);
  const profileIds = (profileData?.getContent() as PerMessageProfileIndex)?.profileIds || [];
  return profileIds
    .map((id) => getPerMessageProfileById(mx, id))
    .filter((profile): profile is PerMessageProfile => profile !== undefined);
}

export function addOrUpdatePerMessageProfile(mx: MatrixClient, profile: PerMessageProfile) {
  const profileListIndex = mx.getAccountData('fyi.cisnt.permessageprofile.index' as any);
  if (profileListIndex?.getContent()?.profileIds.includes(profile.id)) {
    // profile already exists, just update it
    return mx.setAccountData(`fyi.cisnt.permessageprofile.${profile.id}` as any, profile as any);
  }
  // profile doesn't exist, add it to the index and then add the profile data
  const newProfileIds = [...(profileListIndex?.getContent()?.profileIds || []), profile.id];
  return Promise.all([
    mx.setAccountData(
      'fyi.cisnt.permessageprofile.index' as any,
      { profileIds: newProfileIds } as any
    ),
    mx.setAccountData(`fyi.cisnt.permessageprofile.${profile.id}` as any, profile as any),
  ]);
}

export function deletePerMessageProfile(mx: MatrixClient, id: string) {
  return mx.setAccountData(`fyi.cisnt.permessageprofile.${id}` as any, {});
}
