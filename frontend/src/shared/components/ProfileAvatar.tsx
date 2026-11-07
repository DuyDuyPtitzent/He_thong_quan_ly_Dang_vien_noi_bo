import { useEffect, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'

export function ProfileAvatar({ name, image, className }: { name: string; image?: Blob; className?: string }) {
  const [source, setSource] = useState<string>()
  useEffect(() => {
    if (!image) { setSource(undefined); return }
    const url = URL.createObjectURL(image)
    setSource(url)
    return () => URL.revokeObjectURL(url)
  }, [image])
  const initials = name.split(/\s+/).slice(-2).map((part) => part[0]).join('').toLocaleUpperCase('vi')
  return <Avatar size="lg" className={className}><AvatarImage src={source} alt={`Ảnh đại diện của ${name}`} /><AvatarFallback aria-label={`Chữ viết tắt của ${name}`} className="text-2xl font-semibold">{initials || 'HV'}</AvatarFallback></Avatar>
}
