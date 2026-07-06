export type AuthStackParamList = {
  Login: undefined;
};

export type AppStackParamList = {
  Home: undefined;
};

export type RootStackParamList = AuthStackParamList & AppStackParamList;
