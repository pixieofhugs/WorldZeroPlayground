// DefaultProfile mobile — a character's own profile (identity, praxis, tasks).
import { DefaultProfile } from 'worldzero-frontend'
import { profileProps } from './_state'

export function Profile() {
  return <DefaultProfile {...profileProps('ua')} />
}
