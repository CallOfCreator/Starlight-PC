export const profilesQueryKey = ['profiles'] as const;
export const profilesActiveQueryKey = [...profilesQueryKey, 'active'] as const;
export const profilesHasAnyQueryKey = [...profilesQueryKey, 'hasAny'] as const;

export const diskFilesQueryKey = ['disk-files'] as const;
export const unifiedModsQueryKey = ['unified-mods'] as const;

export const profileDiskFilesKey = (profilePath: string) => [...diskFilesQueryKey, profilePath] as const;
export const profileUnifiedModsKey = (profileId: string) => [...unifiedModsQueryKey, profileId] as const;
