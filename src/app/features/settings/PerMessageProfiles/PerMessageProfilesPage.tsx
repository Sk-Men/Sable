import { Page, PageHeader } from '$components/page';
import { Box, IconButton, Icon, Icons, Text } from 'folds';
import { PerMessageProfileOverview } from './PerMessageProfileOverview';

type PerMessageProfilePageProps = {
  requestClose: () => void;
};

export function PerMessageProfilePage({ requestClose }: PerMessageProfilePageProps) {
  return (
    <Page>
      <PageHeader outlined={false}>
        <Box grow="Yes" gap="200">
          <Box grow="Yes" alignItems="Center" gap="200">
            <Text size="H3" truncate>
              Per Message Profiles
            </Text>
          </Box>
          <Box shrink="No">
            <IconButton onClick={requestClose} variant="Surface">
              <Icon src={Icons.Cross} />
            </IconButton>
          </Box>
        </Box>
      </PageHeader>
      <Box grow="Yes">
        <PerMessageProfileOverview />
      </Box>
    </Page>
  );
}
