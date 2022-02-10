import util from 'util'
import {setTimeout} from 'timers/promises'

import {faker} from '@faker-js/faker'

import {serverSide} from './sqs-service.js'

const listenerServiceSide = async () => {
  for await (const message of serverSide.getMessages()) {
    try {
      console.log(message)
      const parsedMessage = JSON.parse(message.Body, null, 4)


      console.log(util.inspect(parsedMessage))

      await serverSide.deleteMessage(message.ReceiptHandle)
    } catch (error) {
      // errors should be handled here, either delete the message from the queue or reset the visibility timeout
      console.log(error)
    }
  }
}


const dummySenderServerSide = async (messageCount = 10) => {
  do {
    try {
      await setTimeout(3000 + Math.floor(Math.random() * 5000))
      await serverSide.sendMessage({
        data: {
          type: 'user',
          id: `${Math.floor(Math.random() * 300)}`,
          attributes: {
            firstname: faker.name.firstName(),
            lastname: faker.name.lastName()
          }
        }
      })
    } catch (error) {
      console.log(error)
    }

    messageCount -= 1
  } while (messageCount > 0)
}

await Promise.all([
  listenerServiceSide(),
  dummySenderServerSide()
])
