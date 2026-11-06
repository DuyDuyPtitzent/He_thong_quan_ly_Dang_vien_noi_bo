import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
import { memberProfilesApi } from './member-profiles.api'

export function MemberProfileAvatar({ name, profileId, mine = false, className }: { name: string; profileId?: string; mine?: boolean; className?: string }) {
  const query = useQuery({ queryKey: ['member-profile-avatar', mine ? 'me' : profileId], queryFn: () => mine ? memberProfilesApi.myAvatar() : memberProfilesApi.memberAvatar(profileId!), enabled: mine || Boolean(profileId), retry: false, staleTime: 60_000 })
  const [source, setSource] = useState<string>()
  useEffect(() => {
    if (!query.data) { setSource(undefined); return }
    const url = URL.createObjectURL(query.data)
    setSource(url)
    return () => URL.revokeObjectURL(url)
  }, [query.data])
  const initials = name.split(/\s+/).slice(-2).map((part) => part[0]).join('').toLocaleUpperCase('vi')
  return <Avatar size="lg" className={className}><AvatarImage src={source} alt={`Ảnh đại diện của ${name}`} /><AvatarFallback aria-label={`Chữ viết tắt của ${name}`} className="text-2xl font-semibold">{initials || 'HV'}</AvatarFallback></Avatar>
}
