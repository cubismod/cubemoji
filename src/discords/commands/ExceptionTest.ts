import { Discord, Permission, Slash } from 'discordx'
import secrets from '../../res/secrets.json'

@Discord()
@Permission(false)
@Permission({ id: secrets.botOwner, type: 'USER', permission: true })
export abstract class ExceptionTest {
  @Slash('exceptiontest', { description: 'Throws an exception for testing purposes' })
  exceptionTest () {
    throw (new Error('oopsies'))
  }
}
