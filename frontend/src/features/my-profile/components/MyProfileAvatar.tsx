import { useQuery } from '@tanstack/react-query'
import { ProfileAvatar } from '@/shared/components/ProfileAvatar'
import { myProfileApi } from '../api/my-profile.api'

export function MyProfileAvatar({ name, className }: { name: string; className?: string }) {
  const query = useQuery({ queryKey: ['member-profile-avatar', 'me'], queryFn: myProfileApi.avatar, retry: false, staleTime: 60_000 })
  return <ProfileAvatar name={name} image={query.data} className={className} />
}
