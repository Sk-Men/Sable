import { PronounSet } from '$utils/pronouns';
import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { MatrixClient } from 'matrix-js-sdk';
import { useMatrixClient } from './useMatrixClient';

const ACCOUNT_DATA_PREFIX = 'fyi.cisnt.permessageprofile';

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
  /**
   * a per message profile can also include pronouns
   * @see PronounSet for the format of the pronouns, and how to parse them from a string input
   */
  pronouns?: PronounSet[];
};

/**
 * the format used by Beeper for per message profiles
 * This is the format that Beeper expects when applying a profile to a message before sending it
 */
export type PerMessageProfileBeeperFormat = {
  /**
   * the unique id for this profile, which is used to identify the profile when applying it to a message, and also used as the key when storing the profile in account data.
   */
  id: string;
  /**
   * the display name to use for messages using this profile. This is required because otherwise the profile would have no effect on the message.
   */
  displayname: string;
  /**
   * the avatar url to use for messages using this profile.
   * Beeper expects this to be a mxc url.
   */
  avatar_url?: string;
  /**
   * using the unstable prefix for pronouns, under which it is also stored in profiles
   */
  'io.fsky.nyx.pronouns'?: PronounSet[];
};

/**
 * converts a per message profile from our format to the format used by Beeper, which is used when applying the profile to a message before sending it.
 * We have out own format because we want to have more control over the data and how it's stored in account data.
 * @export
 * @param {PerMessageProfile} profile the per message profile in our format
 * @return {*}  {PerMessageProfileBeeperFormat} the per message profile in Beeper's format, which can be applied to a message before sending it
 */
export function convertPerMessageProfileToBeeperFormat(
  profile: PerMessageProfile
): PerMessageProfileBeeperFormat {
  return {
    id: profile.id,
    displayname: profile.name,
    avatar_url: profile.avatarUrl,
    'io.fsky.nyx.pronouns': profile.pronouns,
  };
}

/**
 * converts a per message profile from Beeper's format to our format, which is used when storing the profile in account data and using it in the app.
 * We have our own format because we want to have more control over the data and how it's stored in account data.
 *
 * @export
 * @param {PerMessageProfileBeeperFormat} beeperProfile the per message profile in Beeper's format
 * @return {*}  {PerMessageProfile} the per message profile in our format, which can be stored in account data and used in the app
 */
export function convertBeeperFormatToOurPerMessageProfile(
  beeperProfile: PerMessageProfileBeeperFormat
): PerMessageProfile {
  return {
    id: beeperProfile.id,
    name: beeperProfile.displayname,
    avatarUrl: beeperProfile.avatar_url,
    pronouns: beeperProfile['io.fsky.nyx.pronouns'],
  };
}

type PerMessageProfileIndex = {
  /**
   * a list of all profile ids, used to list all profiles when the user wants to manage them.
   */
  profileIds: string[];
};

type PerMessageProfileRoomAssociation = {
  /**
   * the id of the profile to use for messages in this room. This is used to apply a profile to all messages in a room without having to set the profile for each message individually.
   */
  profileId: string;
  /**
   * the id of the room this association applies to.
   * This is used to apply a profile to all messages in a room without having to set the profile for each message individually.
   */
  roomId: string;
  validUntil?: number; // timestamp in ms until which this association is valid, after which it should be ignored and removed. If not set, the association is valid indefinitely until changed or removed.
};

/**
 * the shape of the account data for room associations, which is a wrapper around a list of associations.
 * This is used to store the associations in account data, and allows us to easily add additional fields in the future if needed without breaking the existing data structure.
 */
type PerMessageProfileRoomAssociationWrapper = {
  /**
   * a list of associations between rooms and profiles, which is used to determine which profile to apply to messages in a room when sending a message.
   */
  associations: PerMessageProfileRoomAssociation[];
};

export async function getPerMessageProfileById(
  mx: MatrixClient,
  id: string
): Promise<PerMessageProfile | undefined> {
  const profile = await mx.getAccountData(`${ACCOUNT_DATA_PREFIX}.${id}` as any);
  return profile ? (profile.getContent() as unknown as PerMessageProfile) : undefined;
}

export async function getAllPerMessageProfiles(mx: MatrixClient): Promise<PerMessageProfile[]> {
  const profileData = await mx.getAccountData(`${ACCOUNT_DATA_PREFIX}.index` as any);
  const profileIds = (profileData?.getContent() as PerMessageProfileIndex)?.profileIds || [];
  const profiles = await Promise.all(profileIds.map((id) => getPerMessageProfileById(mx, id)));
  return profiles.filter((profile): profile is PerMessageProfile => profile !== undefined);
}

export function addOrUpdatePerMessageProfile(mx: MatrixClient, profile: PerMessageProfile) {
  const profileListIndex = mx.getAccountData(`${ACCOUNT_DATA_PREFIX}.index` as any);
  console.warn('Storing per-message profile:', profile);
  if (profileListIndex?.getContent()?.profileIds.includes(profile.id)) {
    // profile already exists, just update it
    return mx.setAccountData(`${ACCOUNT_DATA_PREFIX}.${profile.id}` as any, profile as any);
  }
  // profile doesn't exist, add it to the index and then add the profile data
  const newProfileIds = [...(profileListIndex?.getContent()?.profileIds || []), profile.id];
  return Promise.all([
    mx.setAccountData(`${ACCOUNT_DATA_PREFIX}.index` as any, { profileIds: newProfileIds } as any),
    mx.setAccountData(`${ACCOUNT_DATA_PREFIX}.${profile.id}` as any, profile as any),
  ]);
}

export function deletePerMessageProfile(mx: MatrixClient, id: string) {
  return mx.setAccountData(`${ACCOUNT_DATA_PREFIX}.${id}` as any, {});
}

export async function getListOfRoomsUsingProfile(
  mx: MatrixClient,
  profileId: string
): Promise<string[]> {
  const accountData = mx.getAccountData(`${ACCOUNT_DATA_PREFIX}.roomassociation` as any);
  const content = accountData?.getContent()?.associations as
    | PerMessageProfileRoomAssociation[]
    | undefined;

  if (!Array.isArray(content)) {
    // If content is not an array, return empty list
    return [];
  }

  const roomsUsingProfile = content
    .filter(
      (assoc: PerMessageProfileRoomAssociation) =>
        assoc.profileId === profileId && (!assoc.validUntil || assoc.validUntil > Date.now())
    )
    .map((assoc: PerMessageProfileRoomAssociation) => assoc.roomId);

  return roomsUsingProfile;
}

/**
 * gets the per message profile to be used for messages in a room
 * @param mx matrix client
 * @param roomId the room id you are querying for
 * @returns the profile to be used
 */
export async function getCurrentlyUsedPerMessageProfileForRoom(
  mx: MatrixClient,
  roomId: string
): Promise<PerMessageProfile | undefined> {
  const accountData = mx.getAccountData(`${ACCOUNT_DATA_PREFIX}.roomassociation` as any);
  const content = accountData?.getContent()?.associations as
    | PerMessageProfileRoomAssociation[]
    | undefined;

  if (!Array.isArray(content)) {
    // If content is not an array, return undefined
    return undefined;
  }

  const profileId = content
    .filter(
      (assoc: PerMessageProfileRoomAssociation) =>
        !assoc.validUntil || assoc.validUntil > Date.now()
    )
    .find((assoc: PerMessageProfileRoomAssociation) => assoc.roomId === roomId)?.profileId;

  const pmp = profileId ? await getPerMessageProfileById(mx, profileId) : undefined;
  console.warn('getCurrentlyUsedPerMessageProfileIdForRoom', {
    accountData,
    content,
    roomId,
    profileId,
    pmp,
  });
  return profileId ? pmp : undefined;
}

/**
 * sets the per message profile to be used for messages in a room. This is done by setting account data with a list of room associations, which is then checked when sending a message to apply the profile to the message if the room matches an association. The associations can also have an optional expiration time, after which they will be ignored and removed.
 * @param mx matrix client
 * @param roomId the room id your querying for
 * @param profileId the profile id you are querying for
 * @param validUntil the timestamp until the pmp association is valid
 * @param reset if true, the association for the room will be removed, if false and profileId is undefined, the association will be set to undefined but not removed, meaning it will still be visible in the list of associations but won't have any effect. This is useful for resetting the association without losing the information of which profile was associated before.
 * @returns promose that resolves when the association has been set
 */
export function setCurrentlyUsedPerMessageProfileIdForRoom(
  mx: MatrixClient,
  roomId: string,
  profileId: string | undefined,
  validUntil?: number,
  reset?: boolean
) {
  const accountData = mx.getAccountData(`${ACCOUNT_DATA_PREFIX}.roomassociation` as any);
  const content = accountData?.getContent();

  const associations: PerMessageProfileRoomAssociation[] = Array.isArray(content) ? content : [];

  if (profileId) {
    associations.push({ roomId, profileId, validUntil } satisfies PerMessageProfileRoomAssociation);
  } else if (reset) {
    associations.filter((assoc) => assoc.roomId !== roomId);
  }

  const wrapper: PerMessageProfileRoomAssociationWrapper = {
    associations,
  };
  return mx.setAccountData(`${ACCOUNT_DATA_PREFIX}.roomassociation` as any, wrapper as any);
}

// Atom to trigger refresh
const refreshProfileAtomFamily = atomFamily(() => atom(0));

// Atom family to fetch profile for a room
export const perMessageProfileAtomFamily = atomFamily((roomId: string) =>
  atom(async (get) => {
    get(refreshProfileAtomFamily(roomId)); // depend on refresh signal
    const mx = useMatrixClient(); // You need to provide this atom for MatrixClient
    return getCurrentlyUsedPerMessageProfileForRoom(mx, roomId);
  })
);

/**
 * TO-DO
 */
export const invalidatePerMessageProfile: (roomId: string, set: any) => void = (
  roomId: string,
  set: any
) => {
  set(refreshProfileAtomFamily(roomId), (v: number) => v + 1);
};

export function invalidatePerMessageProfileForProfileId(
  mx: MatrixClient,
  profileId: string,
  set: any
) {
  getListOfRoomsUsingProfile(mx, profileId).then((roomIds) => {
    roomIds.forEach((roomId) => {
      set(refreshProfileAtomFamily(roomId), (v: number) => v + 1);
    });
  });
}
