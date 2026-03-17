import { useMatrixClient } from '$hooks/useMatrixClient';
import { getAllPerMessageProfiles, PerMessageProfile } from '$hooks/usePerMessageProfile';
import { useEffect, useState } from 'react';
import { Box } from 'folds';
import { PerMessageProfileEditor } from './PerMessageProfileEditor';

/**
 * Renders a list of per-message profiles along with an editor.
 * @returns rendering of per message profile list including editor
 */
export function PerMessageProfileOverview() {
  const mx = useMatrixClient();
  const [profiles, setProfiles] = useState<PerMessageProfile[]>([]);

  useEffect(() => {
    const fetchProfiles = async () => {
      const fetchedProfiles = await getAllPerMessageProfiles(mx);
      setProfiles(fetchedProfiles);
    };
    fetchProfiles();
  }, [mx]);

  return (
    <Box gap="200" direction="Column" alignItems="Start">
      {profiles.map((profile) => (
        <PerMessageProfileEditor
          mx={mx}
          profileId={profile.id}
          avatarMxcUrl={profile.avatarUrl}
          displayName={profile.name}
        />
      ))}
    </Box>
  );
}
