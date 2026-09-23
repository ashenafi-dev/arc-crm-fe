// Initials avatar in the app-shell warm palette
const AVATAR_TONES = ['#ea4b2c', '#f4c534', '#e98a5b', '#8a7f78', '#d8321a']

export function Avatar({ initials, index = 0, size = 36 }: { initials: string; index?: number; size?: number }) {
  const bg = AVATAR_TONES[index % AVATAR_TONES.length]
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full text-xs font-semibold"
      style={{ width: size, height: size, background: bg, color: bg === '#f4c534' ? '#181412' : '#fff' }}
    >
      {initials}
    </span>
  )
}
