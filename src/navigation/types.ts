export type RootStackParamList = {
  Login: undefined;
  Tabs: undefined;
  Levels: { formationId: string };
  Documents: { levelId: string; formationId: string };
  Reader: { documentId: string };
  Diagnostics: undefined;
};

export type TabParamList = {
  FormationsTab: undefined;
  ProgressTab: undefined;
  ProfileTab: undefined;
};
