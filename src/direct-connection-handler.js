'use strict'

const pull = require('pull-stream')
const Buffer = require('safe-buffer').Buffer
const EventEmitter = require('events')

const emitter = new EventEmitter()

function handler (protocol, conn) {
  conn.getPeerInfo((err, peerInfo) => {
    if (err) {
      return this.emit('error', err)
    }

    const peerId = peerInfo.id.toB58String()

    pull(
      conn,
      pull.map((message) => {
        let msg
        try {
          msg = JSON.parse(message.toString())
        } catch (err) {
          emitter.emit('warning', err.message)
          return // early
        }

        if (peerId !== msg.from) {
          emitter.emit('warning', 'no peerid match ' + msg.from)
          return // early
        }

        const topicIDs = msg.topicIDs
        if (!Array.isArray(topicIDs)) {
          emitter.emit('warning', 'no topic IDs')
          return // early
        }

        msg.data = Buffer.from(msg.data, 'hex')
        msg.seqno = Buffer.from(msg.seqno, 'hex')

        topicIDs.forEach((topic) => {
          emitter.emit(topic, msg)
        })

        return msg
      }),
      pull.onEnd(() => {
        // do nothing
      })
    )
  })
}

exports = module.exports = {
  handler: handler,
  emitter: emitter
}