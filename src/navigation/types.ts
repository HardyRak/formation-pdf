import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  FormationsTab: undefined;
  ProgressTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Levels: { formationId: string };
  Documents: { levelId: string; formationId: string };
  Reader: { documentId: string };
  Diagnostics: undefined;
};
