import { Discord, Slash } from 'discordx'

@Discord()
export abstract class ExceptionTest {
  @Slash('exceptiontest', { description: 'Throws an exception for testing purposes' })
  exceptionTest () {
    throw (new Error('oopsies'))
  }
}
