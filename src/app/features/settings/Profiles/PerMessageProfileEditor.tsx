import { SequenceCard } from '$components/sequence-card';
import { Box, Button, Text, Avatar, config, Icon, IconButton, Icons, Input } from 'folds';
import { MatrixClient } from 'matrix-js-sdk';
import { useCallback, useMemo, useState } from 'react';
import { mxcUrlToHttp } from '$utils/matrix';
import { useFilePicker } from '$hooks/useFilePicker';
import { useMediaAuthentication } from '$hooks/useMediaAuthentication';
import { useObjectURL } from '$hooks/useObjectURL';
import { createUploadAtom } from '$state/upload';
import { UserAvatar } from '$components/user-avatar';
import { CompactUploadCardRenderer } from '$components/upload-card';
import { addOrUpdatePerMessageProfile, deletePerMessageProfile } from '$hooks/usePerMessageProfile';
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
  const [currentDisplayName, setCurrentDisplayName] = useState(displayName ?? '');
  const [newDisplayName, setNewDisplayName] = useState(currentDisplayName);
  const [imageFile, setImageFile] = useState<File | undefined>();
  const [avatarMxc, setAvatarMxc] = useState(avatarMxcUrl);
  const imageFileURL = useObjectURL(imageFile);
  const avatarUrl = useMemo(() => {
    if (imageFileURL) return imageFileURL;
    if (avatarMxc) {
      return mxcUrlToHttp(mx, avatarMxc, useAuthentication, 96, 96, 'crop') ?? undefined;
    }
    return undefined;
  }, [imageFileURL, avatarMxc, mx, useAuthentication]);
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
      if (upload && upload.status === 'success') {
        setAvatarMxc(upload.mxc);
        if (onChange) onChange({ id: profileId, name: newDisplayName, avatarUrl: upload.mxc });
      }
      setImageFile(undefined);
    },
    [onChange, profileId, newDisplayName]
  );
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewDisplayName(e.target.value);
  }, []);

  const [changingDisplayName, setChangingDisplayName] = useState(false);
  // This state is used to disable the display name input while the user is changing it, to prevent them from making changes while the save operation is in progress.
  // It is set to true when the user clicks the save button, and set back to false when the save operation is complete.
  const [disableSetDisplayname, setDisableSetDisplayname] = useState(false);

  const hasChanges = useMemo(
    () => newDisplayName !== (currentDisplayName ?? '') || !!imageFile,
    [newDisplayName, currentDisplayName, imageFile]
  );

  // Reset handler for display name
  const handleReset = useCallback(() => {
    setNewDisplayName(currentDisplayName);
    setChangingDisplayName(false);
    setDisableSetDisplayname(false);
  }, [currentDisplayName]);

  const handleSave = useCallback(() => {
    addOrUpdatePerMessageProfile(mx, {
      id: profileId,
      name: newDisplayName,
      avatarUrl: avatarMxc,
    }).then(() => {
      setCurrentDisplayName(newDisplayName);
    });
    setChangingDisplayName(false);
    setDisableSetDisplayname(false);
  }, [mx, profileId, newDisplayName, avatarMxc]);

  const handleDelete = useCallback(() => {
    deletePerMessageProfile(mx, profileId).then(() => {
      setCurrentDisplayName('');
    });
  }, [mx, profileId]);

  return (
    <Box
      direction="Row"
      gap="200"
      grow="Yes"
      style={{
        width: '100%',
        minWidth: 500,
        paddingTop: config.space.S400,
        paddingBottom: config.space.S400,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      role="form"
      aria-labelledby={`profile-editor-title-${profileId}`}
    >
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Row"
        gap="500"
        style={{
          width: '100%',
          minWidth: 500,
          minHeight: 200,
          padding: config.space.S600,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'visible',
        }}
      >
        <Text
          size="H4"
          style={{ position: 'absolute', top: 8, left: 16 }}
          id={`profile-editor-title-${profileId}`}
        >
          Profile ID: {profileId}
        </Text>
        {/* Linke Spalte: Avatar + Upload */}
        <Box
          direction="Column"
          alignItems="Center"
          justifyContent="Center"
          gap="100"
          style={{ minWidth: 80, maxWidth: 100, flexShrink: 0, overflow: 'visible' }}
          aria-label="Avatar and upload"
        >
          <Avatar
            size="300"
            radii="300"
            style={{
              width: 'clamp(48px, 8vw, 72px)',
              height: 'clamp(48px, 8vw, 72px)',
              minWidth: 48,
              minHeight: 48,
              maxWidth: 72,
              maxHeight: 72,
            }}
            aria-label="Profile avatar"
          >
            <UserAvatar
              userId={profileId}
              src={avatarUrl}
              renderFallback={() => (
                <Text size="H4" aria-label="Avatar fallback">
                  p
                </Text>
              )}
              alt={`Avatar for profile ${profileId}`}
            />
          </Avatar>
          <Button
            onClick={() => pickFile('image/*')}
            size="300"
            variant="Secondary"
            fill="Soft"
            outlined
            radii="300"
            style={{
              width: 'clamp(56px, 10vw, 90px)',
              marginTop: config.space.S100,
              overflow: 'visible',
              fontSize: 14,
              padding: '0 8px',
            }}
            aria-label="Upload avatar image"
          >
            <Text size="T200">Upload</Text>
          </Button>
          {/* Upload-Bereich falls aktiv */}
          {uploadAtom && (
            <Box
              gap="100"
              direction="Column"
              style={{ width: '100%', maxWidth: 100, overflow: 'visible' }}
              aria-label="Upload area"
            >
              <CompactUploadCardRenderer
                uploadAtom={uploadAtom}
                onRemove={handleRemoveUpload}
                onComplete={handleUploaded}
              />
            </Box>
          )}
        </Box>
        {/* Mittlere Spalte: Display Name Input */}
        <Box
          direction="Row"
          alignItems="Center"
          justifyContent="Center"
          style={{ flex: 1, minWidth: 0, height: '100%' }}
          aria-label="Display name input"
        >
          <label
            htmlFor={`displayNameInput-${profileId}`}
            style={{ marginRight: config.space.S200 }}
          >
            <Text size="T300">Display Name:</Text>
          </label>
          <Input
            required
            name="displayNameInput"
            id={`displayNameInput-${profileId}`}
            value={newDisplayName}
            onChange={handleNameChange}
            variant="Secondary"
            radii="300"
            style={{
              flex: 1,
              minWidth: 0,
              width: '100%',
              maxWidth: 'clamp(120px, 40vw, 320px)',
              paddingRight: config.space.S200,
              fontSize: 16,
              height: 36,
            }}
            placeholder="Display name"
            readOnly={changingDisplayName || disableSetDisplayname}
            aria-label="Display name"
            after={
              hasChanges &&
              !changingDisplayName && (
                <IconButton
                  type="reset"
                  onClick={handleReset}
                  size="300"
                  radii="300"
                  variant="Secondary"
                  aria-label="Reset display name"
                >
                  <Icon src={Icons.Cross} size="100" aria-label="Reset icon" />
                </IconButton>
              )
            }
          />
        </Box>
        {/* Rechte Spalte: Save Button */}
        <Box
          direction="Column"
          alignItems="Center"
          justifyContent="Center"
          style={{ minWidth: 120, maxWidth: 140, flexShrink: 0, height: '100%' }}
          aria-label="Save button area"
        >
          <Button
            onClick={handleSave}
            size="300"
            radii="300"
            variant="Primary"
            disabled={!hasChanges}
            style={{
              minWidth: 120,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Save profile changes"
          >
            <Text size="B300">Save</Text>
          </Button>
          <Button
            onClick={handleDelete}
            size="300"
            radii="300"
            variant="Critical"
            fill="None"
            style={{
              minWidth: 120,
              height: 44,
              marginTop: config.space.S100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Delete profile"
          >
            <Text size="B300">Delete</Text>
          </Button>
        </Box>
      </SequenceCard>
    </Box>
  );
}
