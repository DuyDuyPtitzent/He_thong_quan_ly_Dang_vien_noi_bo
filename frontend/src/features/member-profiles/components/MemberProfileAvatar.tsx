import { useQuery } from '@tanstack/react-query'
import { ProfileAvatar } from '@/shared/components/ProfileAvatar'
import { memberProfilesApi } from '../api/member-profiles.api'

export function MemberProfileAvatar({ name, profileId, className }: { name: string; profileId: string; className?: string }) {
  const query = useQuery({ queryKey: ['member-profile-avatar', profileId], queryFn: () => memberProfilesApi.memberAvatar(profileId), enabled: Boolean(profileId), retry: false, staleTime: 60_000 })
  return <ProfileAvatar name={name} image={query.data} className={className} />
}
