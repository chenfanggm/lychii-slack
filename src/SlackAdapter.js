const { RtmClient, WebClient, MemoryDataStore, CLIENT_EVENTS, RTM_EVENTS } = require('@slack/client')
const SlackMessageFormatter = require('./SlackMessageFormatter')
const { asToUserMessage } = require('./MessageUtils')
const debug = require('debug')('app:client:slack')


class SlackAdapter {

  constructor(config) {
    const { token } = config

    if (!token)
      throw new Error('Missing auth token!')

    this.rtm = new RtmClient(token, {
      logLevel: 'error',
      dataStore: new MemoryDataStore()
    })
    this.web = new WebClient(token)
    this.formatter = new SlackMessageFormatter(this.rtm.dataStore)
    this.listeners = []

    this.prepareMessage = this.prepareMessage.bind(this)
  }

  start() {
    debug(`Slack rtm starting...`)
    this.rtm.start()
  }

  disconnect() {
    for (let i = 0; i < this.listeners.length; i++) {
      this.rtm.removeListener(this.listeners[i])
    }
    this.listeners = []
  }

  on(eventName, handler) {
    this.listeners.push(eventName)

    if (eventName === RTM_EVENTS.MESSAGE) {
      this.rtm.on(RTM_EVENTS.MESSAGE, (metaMsg) => {
        const preparedMetaMsg = this.prepareMessage(metaMsg)
        const userName = (preparedMetaMsg.user && preparedMetaMsg.user.name)
          || (preparedMetaMsg.bot && preparedMetaMsg.bot.name)
          || (preparedMetaMsg.channel && preparedMetaMsg.channel.name)

        if (!userName) {
          debug(`Not get username so populate metaMsg:\n${JSON.stringify(preparedMetaMsg)}`)
        }
        debug(`received raw message from ${userName ? userName : 'unknown user'}: ${preparedMetaMsg.rawText}`)
        handler(preparedMetaMsg)
      })
    } else {
      this.rtm.on(eventName, handler)
    }
  }

  prepareMessage(metaMsg) {
    const { user, channel, bot_id } = metaMsg

    if (metaMsg.text && metaMsg.text.trim && typeof metaMsg.text.trim === 'function')
      metaMsg.text = metaMsg.text.trim()

    metaMsg.rawText = metaMsg.text
    metaMsg.text = this.formatter.processIncomingMessageText(metaMsg)

    if (user)
      metaMsg.user = this.rtm.dataStore.getUserById(user)

    if (channel) {
      metaMsg.channel = this.rtm.dataStore.getChannelGroupOrDMById(channel)
      metaMsg.channel.name = metaMsg.channel.name || metaMsg.channel._modelName
      // direct message
      if (metaMsg.channel.name === 'DM')
        metaMsg.isDM = true
    }

    if (bot_id)
      metaMsg.bot = this.rtm.dataStore.getBotById(bot_id)

    return metaMsg
  }

  send(message, target, options) {
    let channelId = null
    let channelName = null
    if (target.channel) {
      channelId = target.channel.id
      channelName = target.channel.name
    } else if (target.id) {
      channelId = target.id
      channelName = target.name
    }
    debug(`sending to ${channelName || channelId}: ${message}`)

    const defaultOptions = {
      as_user: true,
      link_names: 1,
      thread_ts: target.message && target.message.thread_ts
    }
    const opts = Object.assign(defaultOptions, options)

    this.web.chat
      .postMessage(channelId, message, opts)
      .catch(err => {
        debug(err)
      })
  }

  reply(message, target) {
    if (target.isDM)
      return this.send(typeof message === 'string' ? message : message.text, target)

    this.send(
      asToUserMessage(typeof message === 'string' ? message : message.text, target.user),
      target)
  }
}

SlackAdapter.EVENTS = {
  AUTHENTICATED: CLIENT_EVENTS.RTM.AUTHENTICATED,
  CONNECTED: CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED,
  DISCONNECTED: CLIENT_EVENTS.RTM.DISCONNECT,
  MESSAGE: RTM_EVENTS.MESSAGE,
  REACTION_ADDED: RTM_EVENTS.REACTION_ADDED
}

module.exports = SlackAdapter

