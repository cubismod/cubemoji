import { Discord, Permission, Slash } from 'discordx'

@Discord()
@Permission(false)
@Permission({ id: '170358606590377984', type: 'USER', permission: true })
export abstract class ExceptionTest {
  @Slash('exceptiontest', { description: 'Throws an exception for testing purposes' })
  exceptionTest () {
    throw (new Error('oopsies'))
  }
}
