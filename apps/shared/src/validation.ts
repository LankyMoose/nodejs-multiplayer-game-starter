export const validateDisplayName = (displayName: string) => {
  if (displayName.length < 3) {
    return "Username must be at least 3 characters long";
  }
  if (displayName.length > 20) {
    return "Username must be less than 20 characters long";
  }

  return null;
};
