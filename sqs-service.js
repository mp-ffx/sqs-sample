import util from 'util'

import SQS from 'aws-sdk/clients/sqs.js'

const sqs = new SQS({
  endpoint: 'http://localhost:9324',
  accessKeyId: 'sampleAccessKeyId',
  secretAccessKey: 'sampleSecretAccessKey',
  region: 'eu-central-1'
})

sqs.listQueues({}, function (err, data) {
  if (err) {
    return console.log("Error", err)
  }

  console.log("available queues", data.QueueUrls)
})

// this queue is consumed by the client in order to receive updates
const queueUrlReceive = 'http://localhost:9324/000000000000/receive-updates.fifo'

// this queue is used by the client to publish changes
const queueUrlSend = 'http://localhost:9324/000000000000/send-updates.fifo'


async function sendMessage(serviceName, queueUrl, dataToSend) {
  try {
    const sendResponse = await sqs.sendMessage({
      MessageBody: JSON.stringify(dataToSend),
      QueueUrl: queueUrl,
      MessageGroupId: dataToSend.data.id
    }).promise()

    console.log(`######## ${serviceName} - sent message: `)
    console.log(util.inspect(sendResponse))
    console.log(`############################################`)

    return sendResponse
  } catch (error) {
    console.log(`######## ${serviceName} - ERROR sending message: `)
    console.log(error)
    console.log(`############################################`)
  }
}

async function deleteMessage(serviceName, queueUrl, receiptHandle) {
  try {
    const deleteResponse = await sqs.deleteMessage({
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle
    }).promise()
    console.log(`######## ${serviceName} - deleted message: `)
    console.log(util.inspect(deleteResponse))
    console.log(`############################################`)
  } catch (error) {
    console.log(`######## ${serviceName} - Error deleting message: `)
    console.log(error)
    console.log(`############################################`)
  }
}

async function *getMessages(serviceName, queueUrl) {
  do {
    try {
      const received = await sqs.receiveMessage({
        MaxNumberOfMessages: 1,
        MessageAttributeNames: [
          "All"
        ],
        QueueUrl: queueUrl,
        VisibilityTimeout: 20,
        WaitTimeSeconds: 20
      }).promise()

      console.log(`######## ${serviceName} - received message: `)
      console.log(util.inspect(received))
      console.log(`############################################`)

      const message = received?.Messages?.[0]

      if (message) {
        yield message
      }
    } catch (error) {
      console.log(`######## ${serviceName} - Error receiving message: `)
      console.log(error)
      console.log(`############################################`)
    }
  } while (true)
}

const clientSide = {
  getMessages: () => getMessages('clientSide', queueUrlReceive),
  deleteMessage: receiptHandle => deleteMessage('clientSide', queueUrlReceive, receiptHandle),
  sendMessage: data => sendMessage('clientSide', queueUrlSend, data)
}

const serverSide ={
  getMessages: () => getMessages('serverSide', queueUrlSend),
  deleteMessage: receiptHandle => deleteMessage('serverSide', queueUrlSend, receiptHandle),
  sendMessage: data => sendMessage('serverSide', queueUrlReceive, data)
}

export {
  clientSide,
  serverSide
}
