import { SequenceCard } from '$components/sequence-card';
import { Box, Button, Text, Avatar, config, Icon, IconButton, Icons, Input } from 'folds';
// Try relative import for CompactUploadCardRenderer
import { MatrixClient } from 'matrix-js-sdk';
import { useCallback, useMemo, useState } from 'react';
import { mxcUrlToHttp } from '$utils/matrix';
import { useFilePicker } from '$hooks/useFilePicker';
import { useMediaAuthentication } from '$hooks/useMediaAuthentication';
import { useObjectURL } from '$hooks/useObjectURL';
import { createUploadAtom } from '$state/upload';
import { UserAvatar } from '$components/user-avatar';
import { CompactUploadCardRenderer } from '$components/upload-card';
import { SequenceCardStyle } from '../styles.css';

/**
 * the props we use for the per-message profile editor, which is used to edit a per-message profile. This is used in the settings page when the user wants to edit a profile.
 */
type PerMessageProfileEditorProps = {
  mx: MatrixClient;
  profileId: string;
  avatarMxcUrl?: string;
  displayName?: string;
  onChange?: (profile: { id: string; name: string; avatarUrl?: string }) => void;
};

export function PerMessageProfileEditor({
  mx,
  profileId,
  avatarMxcUrl,
  displayName,
  onChange,
}: Readonly<PerMessageProfileEditorProps>) {
  const useAuthentication = useMediaAuthentication();
  const [newDisplayName, setNewDisplayName] = useState(displayName ?? '');
  const [imageFile, setImageFile] = useState<File | undefined>();
  const imageFileURL = useObjectURL(imageFile);
  const avatarUrl = useMemo(() => {
    if (imageFileURL) return imageFileURL;
    if (avatarMxcUrl) {
      return mxcUrlToHttp(mx, avatarMxcUrl, useAuthentication, 96, 96, 'crop') ?? undefined;
    }
    return undefined;
  }, [imageFileURL, avatarMxcUrl, mx, useAuthentication]);
  const uploadAtom = useMemo(() => {
    if (imageFile) return createUploadAtom(imageFile);
    return undefined;
  }, [imageFile]);
  const pickFile = useFilePicker(setImageFile, false);
  const handleRemoveUpload = useCallback(() => {
    setImageFile(undefined);
  }, []);
  const handleUploaded = useCallback(
    (upload: { status: string; mxc: string }) => {
      if (upload && upload.status === 'success' && onChange) {
        onChange({ id: profileId, name: newDisplayName, avatarUrl: upload.mxc });
      }
      setImageFile(undefined);
    },
    [onChange, profileId, newDisplayName]
  );
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewDisplayName(e.target.value);
  }, []);

  // Added missing state and logic for display name editing
  const [changingDisplayName, setChangingDisplayName] = useState(false);
  const [disableSetDisplayname, setDisableSetDisplayname] = useState(false);

  // Determine if there are changes to the display name or avatar
  const hasChanges = useMemo(
    () => newDisplayName !== (displayName ?? '') || !!imageFile,
    [newDisplayName, displayName, imageFile]
  );

  // Reset handler for display name
  const handleReset = useCallback(() => {
    setNewDisplayName(displayName ?? '');
    setChangingDisplayName(false);
    setDisableSetDisplayname(false);
  }, [displayName]);

  return (
    <Box direction="Row" gap="200" grow="Yes" style={{ width: '100%', minWidth: 500 }}>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="500"
        style={{
          width: '100%',
          minHeight: 180,
          margin: '0 auto',
          padding: 32,
          boxSizing: 'border-box',
          display: 'flex',
          justifyContent: 'Center',
        }}
      >
        <Box direction="Row" grow="Yes" gap="400" alignItems="Center" style={{ width: '100%' }}>
          <Box
            direction="Column"
            alignItems="Center"
            gap="100"
            style={{ minWidth: 96, maxWidth: 120, flexShrink: 0, alignSelf: 'flex-start' }}
          >
            <Box
              style={{
                display: 'flex',
                justifyContent: 'Center',
                alignItems: 'Center',
                width: 50,
                height: 50,
              }}
            >
              <Avatar size="500" radii="300">
                <UserAvatar
                  userId={profileId}
                  src={avatarUrl}
                  renderFallback={() => <Text size="H4">p</Text>}
                />
              </Avatar>
            </Box>
            <Button
              onClick={() => pickFile('image/*')}
              size="300"
              variant="Secondary"
              fill="Soft"
              outlined
              radii="300"
              style={{ width: 96, marginTop: 8, boxSizing: 'border-box', alignSelf: 'Center' }}
            >
              <Text size="B300">Upload</Text>
            </Button>
          </Box>
          <Box
            direction="Column"
            gap="200"
            style={{ flex: 1, width: '100%', justifyContent: 'Center' }}
          >
            {uploadAtom ? (
              <Box gap="200" direction="Column">
                <CompactUploadCardRenderer
                  uploadAtom={uploadAtom}
                  onRemove={handleRemoveUpload}
                  onComplete={handleUploaded}
                />
              </Box>
            ) : (
              <Box direction="Row" alignItems="Center" style={{ width: '100%' }}>
                <Input
                  required
                  name="displayNameInput"
                  value={newDisplayName}
                  onChange={handleNameChange}
                  variant="Secondary"
                  radii="300"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    width: '100%',
                    maxWidth: 320,
                    paddingRight: config.space.S200,
                    fontSize: 18,
                    height: 44,
                  }}
                  placeholder="Display name"
                  readOnly={changingDisplayName || disableSetDisplayname}
                  after={
                    hasChanges &&
                    !changingDisplayName && (
                      <IconButton
                        type="reset"
                        onClick={handleReset}
                        size="300"
                        radii="300"
                        variant="Secondary"
                      >
                        <Icon src={Icons.Cross} size="100" />
                      </IconButton>
                    )
                  }
                />
              </Box>
            )}
          </Box>
        </Box>
      </SequenceCard>
    </Box>
  );
}
